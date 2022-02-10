/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const path = require('path');

module.exports = {
  preset: '@kbn/test',
  rootDir: path.resolve(__dirname, '../../..'),
  roots: ['<rootDir>/x-pack/plugins/apm'],
  setupFiles: [
    '<rootDir>/x-pack/plugins/apm/jest_setup.js',
    '<rootDir>/x-pack/plugins/apm/.storybook/jest_setup.js',
  ],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/apm',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/apm/{common,public,server}/**/*.{js,ts,tsx}',
    '!<rootDir>/**/*.stories.*',
  ],
};
