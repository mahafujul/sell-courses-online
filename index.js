const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(bodyParser.json());

//Instead of storing data in these arrays, we will store them in MongoDB.
// let ADMINS = [];
// let USERS = [];
// let COURSES = [];

const secret = "thisIsMySecret";

//Define mongoose schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchasedCourses: [{type: mongoose.Schema.Types.ObjectId, ref: 'Courses'}]
})

const adminSchema = new mongoose.Schema({
  username: String,
  password: String
})

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
});

//Define mongoose models/collections
const Admins = mongoose.model('Admins', adminSchema);
const Users = mongoose.model('Users', userSchema);
const Courses = mongoose.model('Courses', courseSchema);

//Connect to MongoDB 
mongoose.connect('Paste your mongoDB connection string here', { useNewUrlParser: true, useUnifiedTopology: true, dbName: "course-selling" });

function authenticateJwt(req, res, next){
  const token = req.headers.authorization;
  if(token){
    jwt.verify(token, secret,(err, user)=>{
      if(err){
        res.sendStatus(403);
      }else{
        req.username = user.username;
        next();
      }
    });
  }else{
    res.json({message: "Unauthorised"});
  }
}
// Admin routes
app.post('/admin/signup', async (req, res) => {
  // logic to sign up admin
  const {username, password} = req.body;
  const isUserPresent = await Admins.findOne({username});
  if(isUserPresent){
    res.json({message: "User id is already taken try with different one."});
  }else{
    const newAdmin = new Admins({username, password});
    await newAdmin.save();
    res.json({message: "New admin created successfully.", adminID: newAdmin.id});
  }
});

app.post('/admin/login', async (req, res) => {
  // logic to log in admin
  const {username, password} = req.headers;
  const validateUserIDandPassword = await Admins.findOne({username, password});//here we have not write the value of the object. because we have to write it once if our key and value containing variable is same.
  if(validateUserIDandPassword){
    const token = jwt.sign({username,role: "Admin"}, secret, {expiresIn: "1h"});
    res.json({message: "You have successfully logged in.", token: token});
  }else{
    res.json({message: "Please check you username and password."});
  }
});

app.post('/admin/courses',authenticateJwt, async (req, res) => {
  // logic to create a course
  const newCourse = new Courses(req.body);
  await newCourse.save();
  res.json({message: "Course created successfully.", courseId: newCourse.id});
});

app.put('/admin/courses/:courseId',authenticateJwt, async (req, res) => {
  // logic to edit a course
  const courseId = req.params.courseId;
  const updatedCourse = req.body;
  const course = await Courses.findByIdAndUpdate(courseId, updatedCourse, { new: true });
  if(course){
    res.json({message: "Course Updated successfully."});
  }else{
    res.json({message: "Course not present."});
  }
});

app.get('/admin/courses',authenticateJwt, async(req, res) => {
  // logic to get all courses
  const courses = await Courses.find({});
  res.json({courses: courses});
});

// User routes
app.post('/users/signup', async (req, res) => {
  // logic to sign up user
  const {username, password} = req.body;
  const isUserExist = await Users.findOne({username});
  if(isUserExist){
    res.json({message: "Username is already taken."});
  }else{
    const newUser = new Users({username, password});
    await newUser.save();
    res.json({message: "New user created successfully."});
  }
});

app.post('/users/login', async (req, res) => {
  // logic to log in user
  const {username, password} = req.headers;
  const checkUsernameAndPassword = await Users.findOne({username, password});
  if(checkUsernameAndPassword){
    const token = jwt.sign({username, role: "User"},secret,{expiresIn: '1h'});
    res.json({message: "You have successfully logged in.", token: token});
  }else{
    res.json({message: "Please check you username and password."});
  } 
});

app.get('/users/courses',authenticateJwt, async (req, res) => {
  // logic to list all courses
  const getAllCourses = await Courses.find({});
  const allPublishedCourses = getAllCourses.filter((course)=>course.published); //Here we are filtering all 'published' courses to show the user.
  res.json({courses: allPublishedCourses});
});

app.post('/users/courses/:courseId',authenticateJwt,async (req, res) => {
  const isCoursePresent = await Courses.findById(req.params.courseId);
  if(isCoursePresent){
    const user = await Users.findOne({username: req.username});
    if(user){
      user.purchasedCourses.push(isCoursePresent);
      await user.save();
      res.json({message: "You have successfully purchesed the course", courseId: isCoursePresent.id});
    }else{
      res.json({message: "User not found."});
    }
  }else{
    res.status(404).json({message: "Course is not present"});
  }
});

app.get('/users/purchasedCourses',authenticateJwt, async (req, res) => {
  // logic to view purchased courses
  const {username} = req; 
  const user = await Users.findOne({username}).populate('purchasedCourses');
  if(user){
    res.json({courses: user.purchasedCourses});
  }else{
    res.status(403).json({message: "User not present."});
  }
});

// app.listen(3000, () => {
//   console.log('Server is listening on port 3000');
// });

//**********************//
/*If we want to send HTTP queries to our HTTP server using Postman or another tool, 
we must uncomment the lines of code shown above.*/
//**********************//
