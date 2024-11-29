/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: [
    '<rootDir>/x-pack/plugins/observability_solution/inventory/public',
    '<rootDir>/x-pack/plugins/observability_solution/inventory/common',
    '<rootDir>/x-pack/plugins/observability_solution/inventory/server',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/observability_solution/inventory/{public,common,server}/**/*.{js,ts,tsx}',
  ],

  coverageReporters: ['html'],
};
