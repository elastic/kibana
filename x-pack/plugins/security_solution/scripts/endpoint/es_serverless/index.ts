/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunContext } from '@kbn/dev-cli-runner';
import { run as runEs } from '@kbn/es';
import { cyan } from 'chalk';
import { ES_RESOURCES } from '../common/roles_users/serverless';

export const cli = async () => {
  return run(
    async (cliContext: RunContext) => {
      if (!process.argv.includes('serverless')) {
        process.argv.splice(2, 1, 'serverless', process.argv[2]);
      }

      return runEs({
        resources: Object.values(ES_RESOURCES),
      });
    },
    {
      description: `ES serverless start script for Security project.
This is a bypass utility that calls ${cyan('yarn es serverless')} along with some default options
that will enable users and roles to be loaded into ES.
`,
      flags: {
        allowUnexpected: true,
        help: `
Any option supported by ${cyan('yarn es')} can also be used with this utility.

For more on ${cyan('yarn es')} usage, enter: ${cyan('yarn es --help')}
`,
      },
    }
  );
};
