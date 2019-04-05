/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const storybook = require('@storybook/react/standalone');
const execa = require('execa');

// Build SASS sheets for Storybook to use
execa.sync(process.execPath, ['scripts/build_sass'], {
  cwd: path.resolve(__dirname, '../../../..'),
  stdio: ['ignore', 'inherit', 'inherit'],
  buffer: false,
});

storybook({
  mode: 'dev',
  port: 9001,
  configDir: path.resolve(__dirname, './../.storybook'),
});
