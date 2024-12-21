/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
//

module.exports = {
  preset: '@kbn/test/jest_node',
  setupFilesAfterEnv: [],
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/plugins/search_playground/server'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/search_playground/server',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: ['<rootDir>/x-pack/plugins/search_playground/{server}/**/*.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/x-pack/plugins/search_playground/server/setup.ts'],
};
