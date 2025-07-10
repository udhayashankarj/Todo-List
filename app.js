//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const compression = require("compression");
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_CLOUD);

const itemSchema = new mongoose.Schema({
  name: String
});

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const Item = mongoose.model("Item", itemSchema);
const List = mongoose.model("List", listSchema);

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("views", path.join(__dirname, "./views"));

app.use(compression());

const defaultItems = [
  { name: "Welcome to your todolist!" },
  { name: "Hit + button to add a new item." },
  { name: "<-- Hit to delete an item." }
];

app.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    if (items.length === 0) {
      await Item.insertMany(defaultItems);
      return res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: items });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error get/");
  }
});

app.post("/", async (req, res) => {
  const item = new Item({ name: req.body.newItem });
  const listName = req.body.list;

  try {
    if (listName === "Today") {
      await item.save();
      res.redirect("/");
    } else {
      const list = await List.findOne({ name: listName });
      if (list) {
        list.items.push(item);
        await list.save();
        res.redirect("/" + listName);
      } else {
        res.status(404).send("List not found");
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error default list post /");
  }
});

app.post("/delete", async (req, res) => {
  const [itemName, listName] = req.body.item.split(",");

  try {
    if (listName === "Today") {
      await Item.deleteOne({ name: itemName });
      res.redirect("/");
    } else {
      await List.updateOne({ name: listName }, { $pull: { items: { name: itemName } } });
      res.redirect("/" + listName);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error delete /");
  }
});

app.get("/:listName", async (req, res) => {
  const listName = req.params.listName;

  try {
    const list = await List.findOne({ name: listName });
    if (!list) {
      const newList = new List({
        name: listName,
        items: defaultItems
      });
      await newList.save();
      res.redirect("/" + listName);
    } else {
      res.render("list", { listTitle: listName, newListItems: list.items });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error custom/");
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});
if (process.env.IS_VERCEL==="false") {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
// Export the app for deployment
module.exports = app;
