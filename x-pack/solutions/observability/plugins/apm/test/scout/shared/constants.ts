/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test-data primitives shared between APM Scout UI and API suites. UI-only
 * constants (role definitions, page-render timeouts, etc.) live in
 * `../ui/fixtures/constants.ts` which re-exports everything from this module.
 */
export { APM_METRICS_SERVICE_NAMES } from '@kbn/synthtrace';

export const START_DATE = '2021-10-10T00:00:00.000Z';
export const END_DATE = '2021-10-10T00:15:00.000Z';

export const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
export const PRODUCTION_ENVIRONMENT = 'production';
export const METRICS_ENVIRONMENT = 'metrics';

export const SERVICE_AWS_LAMBDA = 'synth-python';

export const SERVICE_METRICS_MIGRATION_SEQUENTIAL = 'metrics-migration-sequential';
export const SERVICE_METRICS_MIGRATION_OVERLAP = 'metrics-migration-overlap';

export const METRICS_MIGRATION_CLASSIC_START_DATE = START_DATE;
export const METRICS_MIGRATION_SEQUENTIAL_CLASSIC_END_DATE = '2021-10-10T00:06:00.000Z';
export const METRICS_MIGRATION_SEQUENTIAL_OTEL_START_DATE = '2021-10-10T00:09:00.000Z';
export const METRICS_MIGRATION_OVERLAP_OTEL_START_DATE = '2021-10-10T00:03:00.000Z';
export const METRICS_MIGRATION_OVERLAP_CLASSIC_END_DATE = '2021-10-10T00:12:00.000Z';
export const METRICS_MIGRATION_OTEL_END_DATE = END_DATE;
export const METRICS_MIGRATION_NO_DATA_START_DATE = '2021-10-10T00:20:00.000Z';
export const METRICS_MIGRATION_NO_DATA_END_DATE = '2021-10-10T00:25:00.000Z';
