/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/plugins/security_solution/public/exceptions'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/security_solution/public/exceptions',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/security_solution/public/exceptions/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.constants.{ts}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.d.ts',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.config.ts',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/index.{js,ts,tsx}',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/translations/*',
    '!<rootDir>/x-pack/plugins/security_solution/public/exceptions/*.translations',
  ],
  moduleNameMapper: require('../../server/__mocks__/module_name_map'),
};
