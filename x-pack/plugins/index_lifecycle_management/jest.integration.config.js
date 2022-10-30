/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/index_lifecycle_management'],
  testMatch: ['/**/integration_tests/**/*.test.{js,mjs,ts,tsx}'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/index_lifecycle_management',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/index_lifecycle_management/{common,public,server}/**/*.{ts,tsx}',
  ],
};
