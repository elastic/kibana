/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/plugins/security_solution/public/timelines'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/security_solution/public/timelines',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/security_solution/public/timelines/**/*.{ts,tsx}',
  ],
  // See: https://github.com/elastic/kibana/issues/117255, the moduleNameMapper creates mocks to avoid memory leaks from kibana core.
  moduleNameMapper: {
    // server global side mocks if for some reason they're added to the tests
    'core/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/core.mock.ts',
    'task_manager/server$':
      '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/task_manager.mock.ts',
    'alerting/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/alert.mock.ts',
    'actions/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/action.mock.ts',

    // front dummy mocks to trim import trees for better memory and performance.
    'data/public$':
      '<rootDir>/x-pack/plugins/security_solution/public/timelines/__mocks__/data.mock.ts',
    'fleet/public$':
      '<rootDir>/x-pack/plugins/security_solution/public/timelines/__mocks__/fleet.mock.ts',
    'core/public$': '<rootDir>/x-pack/plugins/security_solution/public/__mocks__/no_ops.mock.ts',
    'lists/public$': '<rootDir>/x-pack/plugins/security_solution/public/__mocks__/no_ops.mock.ts',
    'ml/public$':
      '<rootDir>/x-pack/plugins/security_solution/public/timelines/__mocks__/ml.mock.ts',
    '@kbn/monaco$': '<rootDir>/x-pack/plugins/security_solution/public/__mocks__/no_ops.mock.ts',
    'common/components/charts/':
      '<rootDir>/x-pack/plugins/security_solution/public/__mocks__/no_ops.mock.ts',
  },
};
