/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { handleProcessInterruptions } from '../common/nodejs_utils';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { EmulatorServer } from './lib/emulator_server';

export const cli = () => {
  run(
    cliRunner,

    // Options
    {
      description: `Start external API emulator`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password'],
        boolean: ['asSuperuser'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          elasticsearch: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          asSuperuser: false,
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
      `,
      },
    }
  );
};

const cliRunner: RunFn = async (cliContext) => {
  // TODO:PT remove options if we are not going to need/use them

  const cliOptions = {
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    kibanaUrl: cliContext.flags.kibana as string,
    elasticsearchUrl: cliContext.flags.elasticsearch as string,
    fleetServerUrl: cliContext.flags.fleetServer as string | undefined,
    asSuperuser: cliContext.flags.asSuperuser as boolean,
    log: cliContext.log,
  };

  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  const emulator = new EmulatorServer({ logger: cliOptions.log });

  await handleProcessInterruptions(
    async () => {
      await emulator.start();
    },
    () => {
      emulator.stop();
    }
  );
};
