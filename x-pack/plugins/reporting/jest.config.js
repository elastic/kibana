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
  testPathIgnorePatterns: [
    '<rootDir>/x-pack/plugins/reporting/server/export_types/csv_searchsource/*',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/common/get_full_urls.test.ts',
    '<rootDir>/x-pack/plugins/reporting/server/usage/reporting_usage_collector.test.ts',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/png/execute_job/index.test.ts',
    '<rootDir>/x-pack/plugins/reporting/server/export_types/printable_pdf/execute_job/index.test.ts',
    '<rootDir>/x-pack/plugins/reporting/server/usage/get_export_stats.test.ts',
    '<rootDir/x-pack/plugins/reporting/server/usage/reporting_usage_collector.test.ts',
    '<rootDir>x-pack/plugins/reporting/server/routes/management/integration_tests/jobs.test.ts',
  ],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/reporting/{common, public, server}/**/*.{js,ts,tsx}',
  ],
};
