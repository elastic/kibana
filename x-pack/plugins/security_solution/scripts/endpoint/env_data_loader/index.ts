/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { load } from './src/load';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';

export const cli = () => {
  run(
    async (cliContext) => {
      createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

      const log = cliContext.log;
      const options = {
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
        kibanaUrl: cliContext.flags.kibana as string,
        elasticsearchUrl: cliContext.flags.elasticsearch as string,
        asSuperuser: cliContext.flags.asSuperuser as boolean,
        log,
      };

      log.info(`Loading data into: ${options.kibanaUrl}`);

      await load(options);
    },

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

    // Options
    {
      description: `Loads data into a environment for testing/development`,
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
