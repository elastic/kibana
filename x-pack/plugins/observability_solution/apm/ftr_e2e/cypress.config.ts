/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { setupNodeEvents } from './setup_cypress_node_events';

export default defineCypressConfig({
  projectId: 'omwh6f',
  fileServerFolder: './cypress',
  fixturesFolder: './cypress/fixtures',
  screenshotsFolder: './cypress/screenshots',
  experimentalMemoryManagement: true,
  videosFolder: './cypress/videos',
  requestTimeout: 10000,
  responseTimeout: 40000,
  defaultCommandTimeout: 30000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  viewportHeight: 1800,
  viewportWidth: 1440,
  video: true,
  screenshotOnRunFailure: true,
  retries: {
    runMode: 1,
  },
  e2e: {
    setupNodeEvents,
    baseUrl: 'http://localhost:5601',
    supportFile: './cypress/support/e2e.ts',
    specPattern: './cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});
