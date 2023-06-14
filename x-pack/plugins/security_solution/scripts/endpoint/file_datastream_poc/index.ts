/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { installDataStreams } from './install';
import { createRuntimeServices } from '../common/stack_services';

export const cli = () => {
  run(
    async (cliCtx) => {
      const username = cliCtx.flags.username as string;
      const password = cliCtx.flags.password as string;
      const kibanaUrl = cliCtx.flags.kibana as string;
      const elasticsearchUrl = cliCtx.flags.elasticsearch as string;
      const asSuperuser = cliCtx.flags.asSuperuser as boolean;
      const logger = cliCtx.log;

      const { esClient, log } = await createRuntimeServices({
        kibanaUrl,
        elasticsearchUrl,
        username,
        password,
        asSuperuser,
        log: logger,
      });

      await installDataStreams(esClient, log);
    },

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
