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
