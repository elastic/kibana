/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { argv } = require('yargs');
const childProcess = require('child_process');
const path = require('path');

const { grep } = argv;

const e2eDir = path.join(__dirname, '../../ftr_e2e');

childProcess.execSync(
  `node ../../../../scripts/functional_tests --config ./cypress_run.ts --grep ${grep}`,
  { cwd: e2eDir, stdio: 'inherit' }
);
