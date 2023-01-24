/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { packagePolicyService } from '@kbn/fleet-plugin/server/services';
import { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { bootstrapIndices } from './indices';
import { putIndexTemplates } from './index_templates';
import { componentTemplates } from './component_templates';
import { putClusterSettings } from './cluster_settings';
import { ilmPolicy } from './ilm';
import { createIngestAPIKey, createReaderRole } from './security';

export async function applySetup(client: ElasticsearchClient): Promise<any> {
  return createReaderRole(client.security)
    .then(() => putClusterSettings(client.cluster))
    .then(() => {
      return ilmPolicy(client.ilm);
    })
    .then(() => {
      return componentTemplates(client.cluster).then((response) => {
        response.filter((r) => {
          if (!r.acknowledged) {
            throw new Error('incomplete component templates setup');
          }
        });
      });
    })
    .then(() => {
      return putIndexTemplates(client.indices);
    })
    .then(() => {
      return bootstrapIndices(client.indices);
    })
    .catch((error) => {
      throw new Error(error);
    });
}

export async function configureFleetPolicy(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<any> {
  return createIngestAPIKey(esClient.security).then((response) => {
    const apmPolicyApiKey = btoa(response.encoded);
    const profilingApmConfig = {
      profiling: {
        enabled: true,
        elasticsearch: {
          api_key: apmPolicyApiKey,
        },
        metrics: {
          elasticsearch: {
            hosts: ['https://1b6c02856ea642a6ac14499b01507233.us-east-2.aws.elastic-cloud.com:443'],
            api_key: 'NaxbCoQBy_DF28rqULgK:FxIjSR__TTy7tDrkrOkGfA',
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
    const defaultCloudApmPackagePolicyID = 'elastic-cloud-apm';
    return packagePolicyService.get(soClient, defaultCloudApmPackagePolicyID).then((policy) => {
      const modifiedPolicyInputs = policy?.inputs
        .filter((i) => i.type === 'apm')
        .map((input) => {
          return {
            ...input,
            config: {
              'apm-server': {
                value: profilingApmConfig,
              },
            },
          } as NewPackagePolicyInput;
        });
      return packagePolicyService.update(soClient, esClient, defaultCloudApmPackagePolicyID, {
        ...(policy as NewPackagePolicy),
        inputs: modifiedPolicyInputs as NewPackagePolicyInput[],
      });
    });
  });
}
