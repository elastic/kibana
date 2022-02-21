/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/plugins/security_solution/public/detections'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/security_solution/public/detections',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/security_solution/public/detections/**/*.{ts,tsx}',
  ],
  // See: https://github.com/elastic/kibana/issues/117255, the moduleNameMapper creates mocks to avoid memory leaks from kibana core.
  moduleNameMapper: {
    'core/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/core.mock.ts',
    'task_manager/server$':
      '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/task_manager.mock.ts',
    'alerting/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/alert.mock.ts',
    'actions/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/action.mock.ts',
  },
};
