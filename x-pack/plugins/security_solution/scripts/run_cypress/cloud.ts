/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
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
      })
        //   )
        // )
        .then((results) => {
          if (!results.length) {
            process.exit(0);
          }
          if (_.some(results, ['status', 'failed'])) {
            process.exit(1);
          }

          // const overallFailed = result.totalFailed + result.totalSkipped;
          // if (overallFailed > 0) {
          //   process.exit(overallFailed);
          // }
          process.exit(0);
        });
      // .catch((err) => {
      //   // if (err instanceof ValidationError) {
      //   //   // program.error(withError(err.toString()));
      //   // } else {
      //   console.error(err);
      //   // }
      //   process.exit(1);
      // });
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
