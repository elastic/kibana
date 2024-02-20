/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dedicated app for output visualization: https://codesandbox.io/p/sandbox/zen-smoke-vxgs2c
 * Just copy the generated content of 'cso_test_log.json' into the 'data.json' file in the dedicated app
 * */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Command line parameters handling
const args = process.argv.slice(2);
const params = {};

args.forEach((arg) => {
  const [argName, argValue] = arg.split('=');
  params[argName] = argValue;
});

// Initiating output, regex line matching and file extensions
const testsLogOutput = [];
const regex = /\b(?:describe\.skip|describe|it\.skip|it)\(['`]/;
const allowedExtensions = ['.ts', '.tsx', '.test.ts', '.test.tsx'];

// Directories to iterate over
const FTR_SERVERLESS =
  'x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture';
const FTR_API_INTEGRATION = 'x-pack/test/api_integration/apis/cloud_security_posture';
const FTR_CSP_API = 'x-pack/test/cloud_security_posture_api';
const FTR_CSP_FUNCTIONAL = 'x-pack/test/cloud_security_posture_functional';
const UNIT_TEST_CSP = 'x-pack/plugins/cloud_security_posture';

const directoryPaths = [
  FTR_SERVERLESS,
  FTR_API_INTEGRATION,
  FTR_CSP_API,
  FTR_CSP_FUNCTIONAL,
  UNIT_TEST_CSP,
];

// Utilities
const toIdFormat = (text) => text.toLowerCase().replace(/\s+/g, '-');

const getCleanLine = (line) => {
  const cleanLine = line;

  if (cleanLine.includes('// ')) {
    return cleanLine.replace('// ', '');
  }

  if (cleanLine.includes("', ")) {
    return cleanLine.split("', ")[0] + "')";
  }
  if (cleanLine.includes('`, ')) {
    return cleanLine.split('`, ')[0] + '`)';
  }

  return cleanLine;
};

const getTags = (filePath, testSuits) => {
  const tags = [];

  if (
    filePath.startsWith(FTR_SERVERLESS) ||
    filePath.startsWith(FTR_API_INTEGRATION) ||
    filePath.startsWith(FTR_CSP_API) ||
    filePath.startsWith(FTR_CSP_FUNCTIONAL)
  ) {
    tags.push('FTR');
  }

  if (filePath.startsWith(UNIT_TEST_CSP)) {
    tags.push('UT');
  }

  if (testSuits.some((suit) => suit.isSkipped)) {
    tags.push('HAS SKIP');
  }

  if (testSuits.some((suit) => suit.isTodo)) {
    tags.push('HAS TODO');
  }

  return tags;
};

// Creates a nested object to represent test hierarchy, useful to understand skip scope
const createTree = (testSuits) => {
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
};

// Processes each line in a file, extracts relevant test data, and adds it to the output
const processFile = (filePath) => {
  const testSuits = [];
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  // Extracts relevant data from the matched line and adds it to the testSuits array
  rl.on('line', (rawLine) => {
    const match = rawLine.match(regex);
    if (match) {
      const [fullMatch] = match;
      const type = fullMatch.startsWith('describe') ? 'describe' : 'it';
      const label = rawLine.trim().replace(/^[^`']*['`]([^'`]*)['`].*$/, '$1');
      const isSkipped = rawLine.includes('.skip(') || rawLine.includes('.skip(`');
      const isTodo = rawLine.includes('todo') || rawLine.includes('TODO');
      const line = getCleanLine(rawLine);
      const indent = (line.match(/^\s*/) || [''])[0].length;

      testSuits.push({
        id: toIdFormat(label),
        rawLine,
        line,
        label,
        indent,
        type,
        isSkipped,
        isTodo,
      });
    }
  });

  // After processing all lines in a file, adds an object containing the file details and its test suits to the output
  rl.on('close', () => {
    if (testSuits.length) {
      const logData = {
        filePath,
        fileName: path.basename(filePath),
        directory: directoryPaths.find((dir) => filePath.startsWith(dir)),
        tags: getTags(filePath, testSuits),
        lines: testSuits.map((testSuit) => (testSuit ? getCleanLine(testSuit.rawLine) : null)),
        testSuits,
        tree: createTree(testSuits),
      };

      testsLogOutput.push(logData);
    }

    // Writes the output to a JSON file
    const outputDir = params['--outputDir'] || __dirname;
    const testsLogOutputFilePath = path.join(outputDir, 'csp_test_log.json');
    fs.writeFileSync(testsLogOutputFilePath, JSON.stringify(testsLogOutput, null, 2));
  });
};

// Recursively iterates over the files of the provided directories
const processDirectory = (directoryPath) => {
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
};

// Initiates the processing for each directory
directoryPaths.forEach(processDirectory);
