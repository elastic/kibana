/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const fileName = 'fr-FR.json';
// Load the JSON file
const data = JSON.parse(fs.readFileSync(fileName));

const replaceString = 'xpack.uptime';

function readCSVFile(filePath) {
  const fileData = fs.readFileSync(filePath, 'utf-8');
  const lines = fileData.split('\n');
  const list = lines[0].split(',');
  return list.map((item) => item.trim());
}

// Usage example
const filePath = 'data.csv';
const searchStrings = readCSVFile(filePath);

// Recursively search and replace the strings in the JSON data
function replaceStrings(obj) {
  const messages = obj.messages;

  const newMessages = {};

  for (const key in messages) {
    if (searchStrings.includes(key)) {
      const newKey = key.replace(/xpack\.synthetics/g, replaceString);
      newMessages[newKey] = messages[key];
    } else {
      newMessages[key] = messages[key];
    }
  }
  obj.messages = newMessages;
}

// Perform the search and replace
replaceStrings(data);

// Save the modified JSON file
fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
