/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import path from 'path';
import { load as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import type { YamlRoleDefinitions } from '@kbn/test-suites-serverless/shared/lib';
import { samlAuthentication } from '@kbn/security-solution-plugin/public/management/cypress/support/saml_authentication';
import { setupUserDataLoader } from './support/setup_data_loader_tasks';
import { getFailedSpecVideos } from './support/filter_videos';

const ROLES_YAML_FILE_PATH = path.join(
  `${__dirname}/support`,
  'project_controller_osquery_roles.yml'
);
const roleDefinitions = loadYaml(readFileSync(ROLES_YAML_FILE_PATH, 'utf8')) as YamlRoleDefinitions;

export const getCypressBaseConfig = (
  overrides: Cypress.ConfigOptions = {}
): Cypress.ConfigOptions =>
  merge(
    {
      reporter: '../../../node_modules/cypress-multi-reporters',
      reporterOptions: {
        configFile: './cypress/reporter_config.json',
      },

      defaultCommandTimeout: 60000,
      execTimeout: 120000,
      pageLoadTimeout: 12000,
      screenshotsFolder: '../../../target/kibana-osquery/cypress/screenshots',
      trashAssetsBeforeRuns: false,
      video: true,
      videosFolder: '../../../target/kibana-osquery/cypress/videos',

      retries: {
        runMode: 1,
        openMode: 0,
      },
      videoCompression: 15,
      viewportHeight: 900,
      viewportWidth: 1440,
      experimentalStudio: true,

      env: {
        grepFilterSpecs: true,
        grepOmitFiltered: true,
      },

      e2e: {
        specPattern: './cypress/e2e/**/*.cy.ts',
        experimentalRunAllSpecs: true,
        experimentalMemoryManagement: true,
        numTestsKeptInMemory: 3,
        setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
          setupUserDataLoader(on, config, { roleDefinitions, additionalRoleName: 'viewer' });
          samlAuthentication(on, config);
          on('after:spec', getFailedSpecVideos);

          return config;
        },
      },
    },
    overrides
  );
