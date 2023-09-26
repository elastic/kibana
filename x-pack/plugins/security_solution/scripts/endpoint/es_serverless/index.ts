/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunContext } from '@kbn/dev-cli-runner';
import { cyan } from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { join } from 'path';
import { ES_RESOURCES } from '../common/roles_users/serverless';

export const cli = async () => {
  return run(
    async (cliContext: RunContext) => {
      const callingArgs = process.argv.slice(2);

      if (!callingArgs.includes('serverless')) {
        callingArgs.unshift('serverless');
      }

      const additionalArgs: string[] = Object.values(ES_RESOURCES).reduce((acc, resourcePath) => {
        acc.push('--resources', resourcePath);
        return acc;
      }, [] as string[]);

      await execa.node(join(REPO_ROOT, 'scripts', 'es'), [...callingArgs, ...additionalArgs], {
        stderr: 'inherit',
        stdout: 'inherit',
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
