/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  defaultCommandTimeout: 150000,
  execTimeout: 150000,
  pageLoadTimeout: 150000,
  numTestsKeptInMemory: 0,
  retries: {
    runMode: 2,
  },
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  e2e: {
    baseUrl: 'http://localhost:5601',
  },
});
