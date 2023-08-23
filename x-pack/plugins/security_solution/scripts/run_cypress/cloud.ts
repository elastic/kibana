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

// eslint-disable-next-line import/no-default-export
export default run(
  async () => {
    const { argv } = yargs(process.argv.slice(2));

    const projectId = (argv.projectId as string) ?? 'security_solution';

    await cypressRun({
      reporter: argv.reporter as string,
      reporterOptions: argv.reporterOptions,
      batchSize: 1,
      projectId,
      recordKey: 'xxx',
      cloudServiceUrl: 'https://cypress-dasbhoard-director-qup6nhupua-uc.a.run.app',
      configFile: path.resolve(argv.configFile as string),
      parallel: true,
      record: true,
      browser: 'chrome',
      headed: true,
      spec: argv.spec as string,
      ciBuildId:
        process.env.BUILDKITE_STEP_ID ?? `${projectId}-${Math.random().toString(36).substring(2)}`,
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
