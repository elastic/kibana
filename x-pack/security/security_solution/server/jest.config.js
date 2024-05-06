/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  /** all nested directories have their own Jest config file */
  testMatch: ['<rootDir>/x-pack/plugins/security_solution/server/*.test.{js,mjs,ts,tsx}'],
  roots: ['<rootDir>/x-pack/plugins/security_solution/server'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/security_solution/server',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: ['<rootDir>/x-pack/plugins/security_solution/server/**/*.{ts,tsx}'],
  moduleNameMapper: require('./__mocks__/module_name_map'),
};
