/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const regex = /\b(?:describe\.skip|describe|it\.skip|it)\(['`]/;
const allowedExtensions = ['.ts', '.tsx', '.test.ts', '.test.tsx'];

const logs = [];

const cleanLine = (line) => {
  if (line.includes("', ")) {
    return line.split("', ")[0] + "')";
  }
  if (line.includes('`, ')) {
    return line.split('`, ')[0] + '`)';
  }
};

function processFile(filePath) {
  const testSuits = [];

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    const match = line.match(regex);
    if (match) {
      const [fullMatch] = match;
      const type = fullMatch.startsWith('describe') ? 'describe' : 'it';
      const label = line.trim().replace(/^[^']*'([^']*)'.*$/, '$1');
      const isSkipped = line.includes('.skip(');
      const indent = (line.match(/^\s*/) || [''])[0].length;

      testSuits.push({
        id: toIdFormat(label),
        rawLine: line,
        line: cleanLine(line),
        label,
        indent,
        type,
        isSkipped,
      });
    }
  });

  rl.on('close', () => {
    if (testSuits.length) {
      const logData = {
        filePath,
        fileName: path.basename(filePath),
        lines: testSuits.map((testSuit) => {
          if (testSuit) {
            return cleanLine(testSuit.rawLine);
          }
        }),
        testSuits,
        tree: createTree(testSuits),
      };

      logs.push(logData);
    }

    // Export logs to a JSON file
    const outputFilePath = path.join(__dirname, 'output.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(logs, null, 2));
    // console.log(`Logs exported to: ${outputFilePath}`);
  });
}

function processDirectory(directoryPath) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${directoryPath}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error reading file stats: ${filePath}`);
          return;
        }

        if (stats.isDirectory()) {
          processDirectory(filePath);
        } else if (stats.isFile() && allowedExtensions.some((ext) => filePath.endsWith(ext))) {
          processFile(filePath);
        }
      });
    });
  });
}

// Replace with the provided directory paths
const directoryPaths = [
  'x-pack/test/cloud_security_posture_functional',
  'x-pack/plugins/cloud_security_posture',
];

directoryPaths.forEach((directoryPath) => {
  processDirectory(directoryPath);
});

function toIdFormat(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}

function createTree(testSuits) {
  const tree = [];
  let currentIndent = 0;
  let currentNode = { children: tree };
  const stack = [currentNode];

  const suits = JSON.parse(JSON.stringify(testSuits));

  suits.forEach((suit) => {
    while (suit.indent < currentIndent && stack.length > 1) {
      stack.pop();
      currentNode = stack[stack.length - 1];
      currentIndent -= 2;
    }

    if (suit.indent >= currentIndent) {
      const newNode = { ...suit };
      if (!currentNode.children) {
        currentNode.children = [];
      }
      currentNode.children.push(newNode);
      stack.push(newNode);
      currentNode = newNode;
      currentIndent = suit.indent + 2;
    }
  });

  return tree;
}
