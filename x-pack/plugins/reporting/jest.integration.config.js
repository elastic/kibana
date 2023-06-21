/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/reporting'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/reporting/server/export_types/printable_pdf_v2/**/*.{js,ts,tsx}',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/x-pack/plugins/reporting/server/export_types/csv_searchsource/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/png*/**/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/png*/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/printable_pdf/**/*.{js,ts,tsx}',
    '<rootDir>/x-pack/plugins/reporting/server/routes/**/*.{js,ts,tsx}',
  ],
};
