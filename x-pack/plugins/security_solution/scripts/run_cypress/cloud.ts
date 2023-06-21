/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import { run as cypressRun } from 'cypress-cloud';
import { fork } from 'child_process';

export const cli = () => {
  run(
    async () => {
      const { argv } = yargs(process.argv.slice(2));

      await new Promise((resolve) => {
        const program = path.resolve(__dirname, '../start_cypress_setup_env.js');
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

        child.on('message', (message) => {
          console.log('message from child:', message);
          resolve(message);
        });
      });

      await cypressRun({
        reporter: argv.reporter as string,
        reporterOptions: argv.reporterOptions,
        batchSize: 1,
        projectId: (argv.projectId as string) ?? 'security_solution',
        recordKey: 'xxx',
        cloudServiceUrl: 'https://cypress-director.herokuapp.com',
        configFile: path.resolve(argv.configFile as string),
        parallel: true,
        record: true,
        browser: 'chrome',
        ciBuildId:
          process.env.BUILDKITE_STEP_ID ??
          `security_solution-${Math.random().toString(36).substring(2)}`,
      }).then((results) => {
        if (results?.status === 'failed' || (results?.totalFailed && results?.totalFailed > 0)) {
          throw new Error('Cypress tests failed');
        }
      });
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
