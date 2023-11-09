/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

import path from 'path';
import { safeLoad as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';

import { getFailedSpecVideos } from './support/filter_videos';
import type { YamlRoleDefinitions } from '../../../test_serverless/shared/lib';
import { setupUserDataLoader } from '../../../test_serverless/functional/test_suites/security/cypress/support/setup_data_loader_tasks';
const ROLES_YAML_FILE_PATH = path.join(
  `${__dirname}/support`,
  'project_controller_osquery_roles.yml'
);
const roleDefinitions = loadYaml(readFileSync(ROLES_YAML_FILE_PATH, 'utf8')) as YamlRoleDefinitions;

export default defineCypressConfig({
  reporter: '../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: './cypress/reporter_config.json',
  },

  defaultCommandTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 12000,

  retries: {
    runMode: 1,
    openMode: 0,
  },

  screenshotsFolder: '../../../target/kibana-osquery/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: true,
  videosFolder: '../../../target/kibana-osquery/cypress/videos',
  videoCompression: 15,
  viewportHeight: 900,
  viewportWidth: 1440,
  experimentalStudio: true,

  env: {
    grepFilterSpecs: true,
    grepTags: '@ess',
    grepOmitFiltered: true,
  },

  e2e: {
    specPattern: './cypress/e2e/**/*.cy.ts',
    baseUrl: 'http://localhost:5601',
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 3,
    setupNodeEvents(on, config) {
      setupUserDataLoader(on, config, { roleDefinitions, additionalRoleName: 'viewer' });
      on('after:spec', getFailedSpecVideos);

      return config;
    },
  },
});
