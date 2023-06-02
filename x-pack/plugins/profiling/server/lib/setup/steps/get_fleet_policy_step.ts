/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { merge, omit } from 'lodash';
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { getApmPolicy } from './get_apm_policy';

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

  return atob(apiKeyResponse.encoded);
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
        const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });

        return apmPolicy && apmPolicy?.inputs[0].config?.['apm-server'].value.profiling;
      } catch (error) {
        logger.debug('Could not fetch fleet policy');
        logger.debug(error);
        return false;
      }
    },
    init: async () => {
      const apmPolicyApiKey = await createIngestAPIKey(client.getEsClient());

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

      const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });

      if (!apmPolicy) {
        throw new Error(`Could not find APM policy`);
      }

      const modifiedPolicyInputs = apmPolicy.inputs.map((input) => {
        return input.type === 'apm'
          ? merge({}, input, { config: { 'apm-server': { value: profilingApmConfig } } })
          : input;
      });

      await packagePolicyClient.update(soClient, esClient, apmPolicy.id, {
        ...omit(apmPolicy, 'id', 'revision', 'updated_at', 'updated_by'),
        inputs: modifiedPolicyInputs,
      });

      // We add here the creation of the new package_policy for symbolizer.
      // We create the new policy and bind it to the Cloud default agent policy;
      // to do so, force s required to be set to true.
      const cloudAgentPolicyId = 'policy-elastic-agent-on-cloud';
      await packagePolicyClient.create(
        soClient,
        esClient,
        {
          policy_id: cloudAgentPolicyId,
          enabled: true,
          package: {
            name: 'profiler_symbolizer',
            title: 'Universal Profiling Symbolizer',
            version: '8.8.0-preview',
          },
          name: 'elastic-universal-profiling-symbolizer',
          namespace: 'default',
          inputs: [
            {
              policy_template: 'universal_profiling_symbolizer',
              enabled: true,
              streams: [],
              type: 'pf-elastic-symbolizer',
            },
          ],
        },
        { force: true }
      );
      await packagePolicyClient.create(
        soClient,
        esClient,
        {
          policy_id: cloudAgentPolicyId,
          enabled: true,
          package: {
            name: 'profiler_collector',
            title: 'Universal Profiling Collector',
            version: '8.9.1-preview',
          },
          name: 'elastic-universal-profiling-collector',
          namespace: 'default',
          inputs: [
            {
              policy_template: 'universal_profiling_collector',
              enabled: true,
              streams: [],
              type: 'pf-elastic-collector',
              vars: {
                "host": {
                  "value": ":8260",
                  "type": "text"
                },
                "secret_token": {
                  "value": "foo_bar",
                  "type": "text"
                },
                "tls_enabled": {
                  "value": true,
                  "type": "bool"
                },
                "tls_supported_protocols": {
                  "value": [
                    "TLSv1.1",
                    "TLSv1.2"
                  ],
                  "type": "text"
                },
                "tls_certificate_path": {
                  "value": "/app/config/certs/node.crt",
                  "type": "text"
                },
                "tls_key_path": {
                  "value": "/app/config/certs/node.key",
                  "type": "text"
                }
              }
            },
          ],
        },
        { force: true }
      );
    },
  };
}
