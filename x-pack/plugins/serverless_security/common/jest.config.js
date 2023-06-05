/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/plugins/serverless_security/common'],
  testMatch: ['<rootDir>/x-pack/plugins/serverless_security/common/**/*.test.{js,mjs,ts,tsx}'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/serverless_security/common',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/serverless_security/common/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/serverless_security/common/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/serverless_security/common/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/plugins/serverless_security/common/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/serverless_security/common/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/serverless_security/common/*.d.ts',
    '!<rootDir>/x-pack/plugins/serverless_security/common/*.config.ts',
    '!<rootDir>/x-pack/plugins/serverless_security/common/index.{js,ts,tsx}',
  ],
};
