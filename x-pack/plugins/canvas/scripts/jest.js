/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');
process.argv.push('--config', resolve(__dirname, '../jest.config.js'));

const storybookPosition = process.argv.indexOf('--storybook');
const allPosition = process.argv.indexOf('--all');

console.log(`
A helper proxying to the following command:

  yarn jest --config x-pack/plugins/canvas/jest.config.js

Provides the following additional options:
  --all              Runs all tests and snapshots.  Slower.
  --storybook        Runs Storybook Snapshot tests only.
`);

if (storybookPosition > -1) {
  process.argv.splice(storybookPosition, 1);

  console.log('Running Storybook Snapshot tests only');
  process.argv.push('canvas/storybook/');
} else if (allPosition > -1) {
  process.argv.splice(allPosition, 1);
  console.log('Running all available tests. This will take a while...');
} else {
  console.log('Running tests. This does not include Storybook Snapshots...');
  process.argv.push('--modulePathIgnorePatterns="/canvas/storybook/"');
}

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'test';
}

require('jest').run();
