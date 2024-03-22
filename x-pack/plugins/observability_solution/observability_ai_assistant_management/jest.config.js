/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/src/plugins/ai_assistant_management/observability'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/src/plugins/ai_assistant_management',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/plugins/ai_assistant_management/observability/{common,public,server}/**/*.{ts,tsx}',
  ],
};
