/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { type ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { type BulkResponseItem } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

export async function updatePoliciesEnrich(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
) {
  // TODO move outside of that service
  const agentPoliciesBulkBody = (
    await pMap(agentPolicyIds, (policyId) => {
      return agentPolicyService.get(soClient, policyId, true);
    })
  ).flatMap((agentPolicy) =>
    agentPolicy
      ? [
          {
            update: {
              _id: agentPolicy.id,
              _index: '.fleet-agent-policies-metadata',
              retry_on_conflict: 3,
            },
          },
          {
            doc: {
              policy_id: agentPolicy.id,
              agent_policy: {
                id: agentPolicy.id,
                name: agentPolicy.name,
                namespace: agentPolicy.namespace,
                inactivity_timeout: agentPolicy.inactivity_timeout,
                is_managed: agentPolicy.is_managed,
                package_policies: agentPolicy.package_policies?.map((packagePolicy) => ({
                  id: agentPolicy.id,
                  name: packagePolicy.name,
                  namespace: packagePolicy.namespace,
                  package: packagePolicy.package
                    ? {
                        name: packagePolicy.package.name,
                        version: packagePolicy.package.version,
                      }
                    : undefined,
                })),
              },
            },
            doc_as_upsert: true,
          },
        ]
      : []
  );

  // Deploy fleet-policies-metadata
  // Could be optimized if feature flag is adopted
  const agentPoliciesBulkResponse = await esClient.bulk({
    index: '.fleet-agent-policies-metadata', // TODO use a constant
    operations: agentPoliciesBulkBody,
    refresh: 'wait_for',
  });

  if (agentPoliciesBulkResponse.errors) {
    const logger = appContextService.getLogger();
    const erroredDocuments = agentPoliciesBulkResponse.items.reduce((acc, item) => {
      const value: BulkResponseItem | undefined = item.index;
      if (!value || !value.error) {
        return acc;
      }

      acc.push(value);
      return acc;
    }, [] as BulkResponseItem[]);

    logger.warn(
      `Failed to index agent policy metadata during policy deployment: ${JSON.stringify(
        erroredDocuments
      )}`
    );
  }
  // execute enrich policy
  await esClient.enrich.executePolicy({
    name: 'fleet-agents-enrich-agent-policies',
    wait_for_completion: true,
  });

  await pMap(agentPolicyIds, (policyId) => {
    // Update will go through the ingest pipeline again
    return esClient.updateByQuery({
      index: '.fleet-agents',
      q: `policy_id:"${policyId}"`,
      ignore_unavailable: true,
    });
  });
}
