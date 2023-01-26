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
  const log = cliContext.log;

  await setupAll({
    elasticUrl,
    kibanaUrl,
    username,
    password,
    log,
  });
};

export const cli = () => {
  run(
    runSetupAll,

    // Options
    {
      description: `
  Enrolls an endpoint with Fleet. It will (if necessary) first create a Fleet Server instance using
  Docker, and then it will initialize a new Ubuntu VM using 'multipass', install Endpoint and enroll
  it with Fleet`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
        --password          User name Password (Default: changeme)
        --kibanaUrl         The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticUrl        The url to Elasticsearch (Default: http://127.0.0.1:9200)
      `,
      },
    }
  );
};
