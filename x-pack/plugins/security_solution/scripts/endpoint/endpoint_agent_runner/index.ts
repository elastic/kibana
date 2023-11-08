/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { setupAll } from './setup';

const runSetupAll: RunFn = async (cliContext) => {
  const username = cliContext.flags.username as string;
  const password = cliContext.flags.password as string;
  const kibanaUrl = cliContext.flags.kibanaUrl as string;
  const elasticUrl = cliContext.flags.elasticUrl as string;
  const fleetServerUrl = cliContext.flags.fleetServerUrl as string;
  const version = cliContext.flags.version as string;
  const policy = cliContext.flags.policy as string;
  const log = cliContext.log;

  await setupAll({
    elasticUrl,
    kibanaUrl,
    fleetServerUrl,
    username,
    password,
    version,
    policy,
    log,
  });
};

export const cli = () => {
  run(
    runSetupAll,

    // Options
    {
      description: `
  Enrolls a new host running Elastic Agent with Fleet. It will (if necessary) first create a
  Fleet Server instance using Docker, and then it will initialize a new Ubuntu VM using
  'multipass', install Elastic Agent and enroll it with Fleet. Can be used multiple times
  against the same stack.`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password', 'version', 'policy'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          version: '',
          policy: '',
        },
        help: `
        --version           Optional. The version of the Agent to use for enrolling the new host.
                            Default: uses the same version as the stack (kibana). Version
                            can also be from 'SNAPSHOT'.
                            Examples: 8.6.0, 8.7.0-SNAPSHOT
        --policy            Optional. An Agent Policy ID to use when enrolling the new Host
                            running Elastic Agent.
        --username          Optional. User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
        --password          Optional. Password associated with the username (Default: changeme)
        --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticUrl        Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
      `,
      },
    }
  );
};
