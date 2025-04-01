/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../..',
  /** all nested directories have their own Jest config file */
  testMatch: [
    '<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/**/*.test.{js,mjs,ts,tsx}',
  ],
  roots: ['<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/chat/plugins/serverless_chat/public',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/*.d.ts',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/*.config.ts',
    '!<rootDir>/x-pack/solutions/chat/plugins/serverless_chat/public/index.{js,ts,tsx}',
  ],
};
