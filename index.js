require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Set up Nodemailer for sending OTP emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.PASSWORD, // Your email password or app-specific password
  },
});

// Generate and send OTP
const generateAndSendOTP = async (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = dayjs().add(10, 'minute').toISOString(); // OTP valid for 10 minutes
  
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
    });
  
    return { otp, otpExpiry };
  };
  

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { name, email, mobile, address } = req.body;
  
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
  
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }
  
    // Generate and send OTP
    const { otp, otpExpiry } = await generateAndSendOTP(email);
  
    // Create a new user with OTP
    const { data, error } = await supabase
      .from('users')
      .insert([{ id: uuidv4(), name, email, mobile, address, otp, otp_expiry: otpExpiry }]);
  
    if (error) {
      console.error('Error creating user:', error.message); // Log the error message
      return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
  
    res.status(200).json({ message: 'User created. OTP sent to email for verification.', success: true});
  });
  

// Verify OTP endpoint
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
  
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
  
    if (error || !user) {
      return res.status(400).json({ message: 'User not found.' });
    }
  
    const currentTime = dayjs();
    const otpExpiry = dayjs(user.otp_expiry);
  
    console.log(`Stored OTP Expiry: ${otpExpiry.toString()}`);
    console.log(`Current Time: ${currentTime.toString()}`);
  
    if (user.otp !== otp || otpExpiry.isBefore(currentTime)) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
  
    await supabase
      .from('users')
      .update({ otp: null, otp_expiry: null })
      .eq('email', email);
  
    res.status(200).json({ message: 'OTP verified successfully. Signup complete.' });
  });
  
  

// Login endpoint
// Login endpoint
app.post('/login', async (req, res) => {
    const { email } = req.body;
  
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
  
      if (error || !user) {
        return res.status(400).json({ message: 'User not found.' });
      }
  
      const { otp, otpExpiry } = await generateAndSendOTP(email);
  
      await supabase
        .from('users')
        .update({ otp, otp_expiry: otpExpiry })
        .eq('email', email);
  
      res.status(200).json({ message: 'OTP sent to email for login verification.', success: true });
    } catch (error) {
      console.error('Error in login:', error.message);
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
  });
  
  // OTP verification for login endpoint
  app.post('/login-verify', async (req, res) => {
    const { email, otp } = req.body;
  
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
  
      if (error || !user) {
        return res.status(400).json({ message: 'User not found.' });
      }
  
      const currentTime = dayjs();
      const otpExpiry = dayjs(user.otp_expiry);
  
      if (user.otp !== otp || otpExpiry.isBefore(currentTime)) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
      }
  
      // Clear OTP after successful verification
      await supabase
        .from('users')
        .update({ otp: null, otp_expiry: null })
        .eq('email', email);
  
      res.status(200).json({ message: 'Login successful!', success: true });
    } catch (error) {
      console.error('Error verifying OTP:', error.message);
      res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
  });
  


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});





//git config --global user.name "Aditya Ingale"
// git config --global user.email "adiingale1814@gmail.com"
