#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const path = require('path');
const { logError } = require('./log_error');

const PLUGIN_DIR = path.resolve(path.join(__dirname, '..'));

module.exports = {
  writeGeneratedFile,
};

function writeGeneratedFile(fileName, contents) {
  const genFileName = path.join(PLUGIN_DIR, fileName);
  try {
    fs.writeFileSync(genFileName, contents);
  } catch (err) {
    logError(`error writing file: ${genFileName}: ${err.message}`);
  }
}
