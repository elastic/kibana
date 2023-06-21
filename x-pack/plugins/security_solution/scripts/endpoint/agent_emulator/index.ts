/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { agentEmulatorRunner } from './agent_emulator';

const DEFAULT_CHECKIN_INTERVAL = 60_000; // 1m
const DEFAULT_ACTION_DELAY = 5_000; // 5s

export const cli = () => {
  run(
    agentEmulatorRunner,

    // Options
    {
      description: `Endpoint agent emulator.`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        boolean: ['asSuperuser'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          elasticsearch: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          asSuperuser: false,
          actionDelay: DEFAULT_ACTION_DELAY,
          checkinInterval: DEFAULT_CHECKIN_INTERVAL,
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' AND 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --asSuperuser       If defined, then a Security super user will be created using the
                            the credentials defined via 'username' and 'password' options. This
                            new user will then be used to run this utility.
        --kibana            The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticsearch     The url to Elasticsearch (Default: http://127.0.0.1:9200)
        --checkinInterval   The interval between how often the Agent is checked into fleet and a
                            metadata document update is sent for the endpoint. Default is 1 minute
        --actionDelay       The delay (in milliseconds) that should be applied before responding
                            to an action. (Default: 5000 (5s))
      `,
      },
    }
  );
};
