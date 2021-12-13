/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../',
  /** all nested directories have their own Jest config file */
  testMatch: ['<rootDir>/x-pack/plugins/cloud_security_posture/server/routes/stats/stats.tests.ts'],
  roots: ['<rootDir>/x-pack/plugins/cloud_security_posture/server/'],
  coverageDirectory:
    '<rootDir>/x-pack/plugins/cloud_security_posture/server/routes/stats/stats.test.ts',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/cloud_security_posture/server/routes/**/*.{ts,tsx}',
  ],
};
