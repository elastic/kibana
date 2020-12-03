/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

if (process.argv.indexOf('--config') === -1) {
  // append correct jest.config if none is provided
  const configPath = require('path').resolve(__dirname, '../jest.config.js');
  process.argv.push('--config', configPath);
  console.log('Running Jest with --config', configPath);
}

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'test';
}

require('jest').run();
