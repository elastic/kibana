/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createRuntimeServices } from '../common/stack_services';
import type { RolesAndUsersType } from './load_roles_users';
import { loadRolesAndUsers } from './load_roles_users';

export const cli = () => {
  run(
    cliRunner,

    // Options
    {
      description: `Load Roles and Users into Kibana`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          elasticsearch: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          type: 'serverless',
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' AND 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --kibana            The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticsearch     The url to Elasticsearch (Default: http://127.0.0.1:9200)
        --type              The type of roles/users to load. Valid values are:
                            - serverless: loads roles and users used in the serverless projects
      `,
      },
    }
  );
};

const cliRunner: RunFn = async (cliContext) => {
  const { kbnClient, log } = await createRuntimeServices({
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    kibanaUrl: cliContext.flags.kibana as string,
    elasticsearchUrl: cliContext.flags.elasticsearch as string,
    log: cliContext.log,
  });
  const type = (cliContext.flags.type as string).toLowerCase() as RolesAndUsersType;

  await loadRolesAndUsers(kbnClient, log, type);
};
