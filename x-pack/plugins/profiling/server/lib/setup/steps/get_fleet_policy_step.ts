/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { merge, omit } from 'lodash';
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

async function createIngestAPIKey(esClient: ElasticsearchClient) {
  const apiKeyResponse = await esClient.security.createApiKey({
    name: 'profiling-manager',
    role_descriptors: {
      profiling_manager: {
        indices: [
          {
            names: ['profiling-*', '.profiling-*'],
            privileges: [
              'read',
              'create_doc',
              'create',
              'write',
              'index',
              'create_index',
              'view_index_metadata',
              'manage',
            ],
          },
        ],
        cluster: ['monitor'],
      },
    },
  });

  return btoa(apiKeyResponse.encoded);
}

export function getFleetPolicyStep({
  client,
  soClient,
  logger,
  packagePolicyClient,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();
  return {
    name: 'fleet_policy',
    hasCompleted: async () => {
      try {
        const apmPolicies = await packagePolicyClient.list(soClient, {
          kuery: 'ingest-package-policies.package.name:apm',
        });
        return (
          apmPolicies.items.length > 0 &&
          apmPolicies.items.every(
            (policy) => !!policy?.inputs[0].config?.['apm-server'].value.profiling
          )
        );
      } catch (error) {
        logger.debug('Could not fetch fleet policy');
        logger.debug(error);
        return false;
      }
    },
    init: async () => {
      const apmPolicyApiKey = createIngestAPIKey(client.getEsClient());

      const profilingApmConfig = {
        profiling: {
          enabled: true,
          elasticsearch: {
            api_key: apmPolicyApiKey,
          },
          metrics: {
            elasticsearch: {
              hosts: [
                'https://1b6c02856ea642a6ac14499b01507233.us-east-2.aws.elastic-cloud.com:443',
              ],
              api_key: 'woq-IoMBRbbiEbPugtWW:_iBmc1PdSout7sf5FCkEpA',
            },
          },
          keyvalue_retention: {
            // 60 days
            age: '1440h',
            // 200 Gib
            size_bytes: 200 * 1024 * 1024 * 1024,
            execution_interval: '12h',
          },
        },
      };

      const apmPolicies = await packagePolicyClient.list(soClient, {
        kuery: 'ingest-package-policies.package.name:apm',
      });

      if (apmPolicies.total > apmPolicies.items.length) {
        logger.warn(
          `Updating ${apmPolicies.items.length} out of ${apmPolicies.total}, at least some will not be updated`
        );
      }

      await Promise.all(
        apmPolicies.items.map(async (policy) => {
          const modifiedPolicyInputs = policy.inputs.map((input) => {
            return input.type === 'apm'
              ? merge({}, input, { config: { 'apm-server': { value: profilingApmConfig } } })
              : input;
          });

          await packagePolicyClient.update(soClient, esClient, policy.id, {
            ...omit(policy, 'id', 'revision', 'updated_at', 'updated_by'),
            inputs: modifiedPolicyInputs,
          });
        })
      );
    },
  };
}
