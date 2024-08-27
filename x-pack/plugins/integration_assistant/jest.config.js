/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/integration_assistant'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/integration_assistant',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/integration_assistant/{common,server,public}/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/integration_assistant/{__jest__}/**/*',
    '!<rootDir>/x-pack/plugins/integration_assistant/**/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/integration_assistant/**/*.config.ts',
  ],
  setupFiles: ['jest-canvas-mock'],
};
