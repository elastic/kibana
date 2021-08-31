/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const childProcess = require('child_process');
const path = require('path');

function runFTRScript({ server, runner, configScript }) {
  let ftrScript = 'functional_tests';
  if (server) {
    ftrScript = 'functional_tests_server';
  } else if (runner) {
    ftrScript = 'functional_test_runner';
  }
  childProcess.execSync(
    `node ../../../../scripts/${ftrScript} --config ${configScript}`,
    { cwd: path.join(__dirname), stdio: 'inherit' }
  );
}

module.exports = runFTRScript;
