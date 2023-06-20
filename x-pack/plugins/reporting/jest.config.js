/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/reporting'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/reporting',
  coverageReporters: ['text', 'html'],
  coveragePathIgnorePatterns: [
    '<rootDir>/x-pack/plugins/reporting/server/export_types/csv_searchsource/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/png*/**/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/png*/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/printable_pdf/**/*.{js,ts,tsx}',
  ],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/reporting/{cmmon,public, server}/**/*.{js,ts,tsx}',
  ],
};
