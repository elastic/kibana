/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE } from '../common/constants';
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
        noCertForSsl: true,
      });

      const options = {
        policyCount: Number(cliContext.flags.policyCount),
        trustedAppsCount: Number(cliContext.flags.trustedAppsCount),
        eventFiltersCount: Number(cliContext.flags.eventFiltersCount),
        blocklistsCount: Number(cliContext.flags.blocklistsCount),
        hostIsolationExceptionsCount: Number(cliContext.flags.hostIsolationExceptionsCount),
        endpointExceptionsCount: Number(cliContext.flags.endpointExceptionsCount),
        globalArtifactRatio: Number(cliContext.flags.globalArtifactRatio),
        concurrency: Number(cliContext.flags.concurrency),
      };

      log.info(`${HORIZONTAL_LINE}
 Environment Data Loader
${HORIZONTAL_LINE}
`);
      log.info(`Loading data to: ${kbnClient.resolveUrl('')}`);

      await load({
        kbnClient,
        log,
        ...options,
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
          trustedAppsCount: 10,
          eventFiltersCount: 10,
          blocklistsCount: 10,
          hostIsolationExceptionsCount: 10,
          endpointExceptionsCount: 10,
          globalArtifactRatio: 50,
          concurrency: 10,
        },
        allowUnexpected: false,
        help: `
        --username                      User name to be used for auth against elasticsearch and
                                        kibana (Default: elastic).
        --password                      User name Password (Default: changeme)
        --kibana                        The url to Kibana (Default: http://127.0.0.1:5601)
        --policyCount                   How many policies to create (Default: 10)
        --trustedAppsCount              How many Trusted Applications to create (Default: 10)
        --eventFiltersCount             How many Event Filters to create (Default: 10)
        --blocklistsCount               How many Blocklists to create (Default: 10)
        --hostIsolationExceptionsCount  How many Host Isolation Exceptions to create (Default: 10)
        --endpointExceptionsCount       How many Endpoint Exceptions to create (Default: 10)
        --globalArtifactRatio           The percentage ratio of all artifacts that should be global
                                        rather than per-policy. (Default: 50)
        --concurrency                   The max number of request to process in parallel. (Default: 10)
      `,
      },
    }
  );
};
