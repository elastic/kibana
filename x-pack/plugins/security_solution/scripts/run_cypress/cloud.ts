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

export const cli = () => {
  run(
    async () => {
      const { argv } = yargs(process.argv.slice(2));

      console.error('argv', argv, path.resolve(argv.configFile));

      // await Promise.allSettled(
      //   _.times(2).map(() =>
      await cypressRun({
        reporter: argv.reporter as string,
        reporterOptions: argv.reporterOptions,
        batchSize: 1,
        projectId: 'security_solution',
        recordKey: 'xxx',
        cloudServiceUrl: 'https://cypress-director.herokuapp.com',
        configFile: path.resolve(argv.configFile) as string,
        parallel: true,
        record: true,
        headless: false,
        headed: true,
        browser: 'chrome',
        spec: './cypress/e2e/investigations/**/*.cy.ts',
        ciBuildId:
          process.env.BUILDKITE_STEP_ID ??
          `hello-currents-${Math.random().toString(36).substring(2)}`,
      });
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
