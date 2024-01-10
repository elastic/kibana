/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createKbnClient } from '../common/stack_services';
import { load } from './src/load';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';

export const cli = () => {
  run(
    async (cliContext) => {
      createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

      const log = cliContext.log;
      const kbnClient = createKbnClient({
        log,
        url: cliContext.flags.kibana as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
      });

      const options = {
        policyCount: Number(cliContext.flags.policyCount) || 10,
      };

      /*
        load_env_data
            --policyCount=5000
            --trustedAppsCount=1000
            --eventFiltersCount=1000
            --blocklists=10
            --hostIsolationExceptions=10
            --endpointExceptions=10
            --globalArtifactRatio=50
     */

      log.info(`Loading data to: ${kbnClient.resolveUrl('')}`);

      await load({
        kbnClient,
        log,
        policyCount: options.policyCount,
      });
    },

    // Options
    {
      description: `Loads data into a environment for testing/development`,
      flags: {
        string: ['kibana', 'username', 'password'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          username: 'elastic',
          password: 'changeme',
          policyCount: 10,
        },
        help: `
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' AND 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --kibana            The url to Kibana (Default: http://127.0.0.1:5601)
        --policyCount       How many policies to create (Default: 10)
      `,
      },
    }
  );
};
