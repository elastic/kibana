/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
const { cloudPlugin } = require('cypress-cloud/plugin');
const path = require('path');
const fork = require('child_process').fork;

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
  supportFolder: './cypress/support_cloud',
  e2e: {
    baseUrl: 'http://google.com',
    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    specPattern: '../**/cypress/e2e/{,!(investigations,explore)/**/}*.cy.ts',
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
    setupNodeEvents(on, config) {
      let processes = [];

      // on('before:run', async (spec) => {
      //   console.error('before:run', spec);
      //   const program = path.resolve('../scripts/start_cypress_setup_env.js');
      //   const parameters = [
      //     `run --ftr-config-file '../../test/security_solution_cypress/cli_config.ts'`,
      //   ];
      //   const options = {
      //     env: {
      //       NODE_TLS_REJECT_UNAUTHORIZED: '0',
      //       NODE_OPTIONS: '--no-warnings',
      //       PATH: process.env.PATH,
      //     },
      //     stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      //   };

      //   const child = fork(program, parameters, options);

      //   processes.push(child);

      //   config.baseUrl = 'http://localhost:5622';
      //   return new Promise((resolve) => {
      //     child.on('message', (message) => {
      //       console.log('message from child:', message);
      //       // console.log('config', config);
      //       // config.baseUrl = message.customEnv.baseUrl;
      //       // process.exit(0);
      //       resolve(message);
      //       // child.send('Hi');
      //       // return config;
      //       // return config;
      //     });
      //   });
      // });

      on('before:spec', (spec) => {
        console.error('processes', processes.length, processes);
        console.error('before:spec', spec);

        if (!processes.length) {
          const program = path.resolve('../scripts/start_cypress_setup_env.js');
          const parameters = [
            `run --ftr-config-file '../../test/security_solution_cypress/cli_config.ts'`,
          ];
          const options = {
            env: {
              NODE_TLS_REJECT_UNAUTHORIZED: '0',
              NODE_OPTIONS: '--no-warnings',
              PATH: process.env.PATH,
            },
            stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
          };

          const child = fork(program, parameters, options);

          processes.push(child);

          return new Promise((resolve) => {
            child.on('message', (message) => {
              console.log('message from child:', message);
              // console.log('config', config);
              // config.baseUrl = message.customEnv.baseUrl;
              // process.exit(0);
              resolve(message);
              // child.send('Hi');
              // return config;
              // return config;
            });
          });
        }
      });

      on('after:spec', (spec, results) => {
        console.error('after:spec', spec, results);
        console.error('preosdsd', processes);
        processes.forEach((child) => {
          child.kill();
        });
        processes = [];
      });

      return cloudPlugin(on, config);
    },
  },
});
