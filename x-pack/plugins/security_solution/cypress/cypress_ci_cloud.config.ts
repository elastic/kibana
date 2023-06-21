/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { cloudPlugin } from 'cypress-cloud/plugin';
import path from 'path';
import execa from 'execa';
import { fork } from 'child_process';
import type { ChildProcess } from 'child_process';
import { esArchiver } from './support/es_archiver';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  defaultCommandTimeout: 150000,
  execTimeout: 150000,
  pageLoadTimeout: 150000,
  numTestsKeptInMemory: 5,
  retries: {
    runMode: 1,
  },
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  e2e: {
    baseUrl: 'http://localhost:5622',
    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    specPattern: ['./cypress/e2e', '!./cypress/e2e/investigations', '!./cypress/e2e/explore'],
    supportFile: './cypress/support/e2e_cloud.js',
    env: {
      FORCE_COLOR: '1',
      CYPRESS_BASE_URL: 'http://elastic:changeme@localhost:5622',
      CYPRESS_ELASTICSEARCH_URL: 'http://system_indices_superuser:changeme@localhost:9222',
      CYPRESS_ELASTICSEARCH_USERNAME: 'system_indices_superuser',
      CYPRESS_ELASTICSEARCH_PASSWORD: 'changeme',
      baseUrl: 'http://elastic:changeme@localhost:5622',
      BASE_URL: 'http://elastic:changeme@localhost:5622',
      ELASTICSEARCH_URL: 'http://system_indices_superuser:changeme@localhost:9222',
      ELASTICSEARCH_USERNAME: 'system_indices_superuser',
      ELASTICSEARCH_PASSWORD: 'changeme',
    },
    async setupNodeEvents(on, config) {
      await cloudPlugin(on, config);
      let processes: ChildProcess[] = [];

      const esArchiverInstance = esArchiver(on, config);

      on('before:run', (spec) => {
        try {
          execa.commandSync('kill $(lsof -t -i:5622)', { shell: true });
          // eslint-disable-next-line no-empty
        } catch (e) {}
        try {
          execa.commandSync('kill $(lsof -t -i:9222)', { shell: true });
          // eslint-disable-next-line no-empty
        } catch (e) {}
      });

      on('before:spec', (spec) => {
        console.error('before:spec', spec, processes);

        if (processes.length) {
          processes.forEach((child) => {
            child.kill();
          });
          processes = [];
        }

        if (!processes.length) {
          const program = path.resolve('../scripts/start_cypress_setup_env.js');
          const parameters = [
            `run --ftr-config-file '../../test/security_solution_cypress/cli_config.ts'`,
          ];
          const options = {
            env: {
              NODE_OPTIONS: '--no-warnings',
              PATH: process.env.PATH,
              KIBANA_INSTALL_DIR: process.env.KIBANA_INSTALL_DIR,
              CI: process.env.CI,
            },
            stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
          };

          const child = fork(program, parameters, options);

          processes.push(child);

          return new Promise((resolve) => {
            child.on('message', (message) => {
              console.log('message from child:', message);
              esArchiverInstance.load('auditbeat').then(() => resolve(message));
            });
          });
        }
      });

      return config;
    },
  },
});
