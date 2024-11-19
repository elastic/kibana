/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: [
    '<rootDir>/x-pack/plugins/inference/public',
    '<rootDir>/x-pack/plugins/inference/server',
    '<rootDir>/x-pack/plugins/inference/common',
  ],
  setupFiles: [],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/inference/{public,server,common}/**/*.{js,ts,tsx}',
  ],

  coverageReporters: ['html'],
};
