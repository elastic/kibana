/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

const CI = process.env.BUILDKITE === 'true';

/**
 * Converts seconds to milliseconds
 * @param s Seconds
 * @returns milliseconds
 */
const sToMs = (s: number) => s * 1000;

const LOCAL_CONFIG: Cypress.ConfigOptions<any> = {
  defaultCommandTimeout: sToMs(10),
};

const CI_CONFIG: Cypress.ConfigOptions<any> = {
  defaultCommandTimeout: sToMs(120),
};

export default defineCypressConfig({
  ...(CI ? CI_CONFIG : LOCAL_CONFIG),
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  retries: {
    runMode: 2,
  },
  screenshotsFolder: '../../../target/kibana-threat-intelligence/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-threat-intelligence/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  env: {
    protocol: 'http',
    hostname: 'localhost',
    configport: '5601',
  },
  e2e: {
    baseUrl: 'http://localhost:5601',
  },
});
