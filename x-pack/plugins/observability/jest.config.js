/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is an APM-specific Jest configuration which overrides the x-pack
// configuration. It's intended for use in development and does not run in CI,
// which runs the entire x-pack suite. Run `npx jest`.

require('../../../src/setup_node_env');

const { createJestConfig } = require('../../dev-tools/jest/create_jest_config');
const { resolve } = require('path');

const rootDir = resolve(__dirname, '.');
const xPackKibanaDirectory = resolve(__dirname, '../..');
const kibanaDirectory = resolve(__dirname, '../../..');

const jestConfig = createJestConfig({
  kibanaDirectory,
  rootDir,
  xPackKibanaDirectory,
});

module.exports = {
  ...jestConfig,
  reporters: ['default'],
  roots: [`${rootDir}/common`, `${rootDir}/public`, `${rootDir}/server`],
  collectCoverage: true,
  collectCoverageFrom: [
    ...jestConfig.collectCoverageFrom,
    '**/*.{js,mjs,jsx,ts,tsx}',
    '!**/*.stories.{js,mjs,ts,tsx}',
    '!**/target/**',
    '!**/typings/**',
  ],
  coverageDirectory: `${rootDir}/target/coverage/jest`,
  coverageReporters: ['html'],
};
