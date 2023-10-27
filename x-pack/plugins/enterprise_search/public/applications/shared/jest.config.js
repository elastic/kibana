/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/plugins/enterprise_search/public/applications/shared'],
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/enterprise_search/public/applications/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/enterprise_search/public/*.ts',
    '!<rootDir>/x-pack/plugins/enterprise_search/server/*.ts',
    '!<rootDir>/x-pack/plugins/enterprise_search/public/applications/test_helpers/**/*.{ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/enterprise_search/public/applications/shared',
  modulePathIgnorePatterns: [
    '<rootDir>/x-pack/plugins/enterprise_search/public/applications/app_search/cypress',
    '<rootDir>/x-pack/plugins/enterprise_search/public/applications/workplace_search/cypress',
  ],
};
