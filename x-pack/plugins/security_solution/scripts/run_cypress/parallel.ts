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
import { run as cypressRun } from '@kbn/cypress';

export const cli = () => {
  run(
    async () => {
      const { argv } = yargs(process.argv.slice(2));

      console.error('argv', argv);

      await Promise.allSettled(
        _.times(2).map(() =>
          cypressRun({
            reporter: argv.reporter as string,
            reporterOptions: argv.reporterOptions,
            batchSize: 1,
            projectId: 'security_solution',
            recordKey: 'xxx',
            cloudServiceUrl: 'https://cypress-director.herokuapp.com',
            configFile: path.resolve(argv.configFile) as string,
            parallel: true,
            record: true,
            ciBuildId: process.env.BUILDKITE_BUILD_ID ?? `hello-currents19`,
          })
        )
      ).then((results) => {
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
