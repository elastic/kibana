/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import pMap from 'p-map';

import { agentPolicyService } from '../agent_policy';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from '../api_keys';
import { SO_SEARCH_LIMIT } from '../../constants';
import { appContextService } from '../app_context';

export async function ensureAgentPoliciesFleetServerKeysAndPolicies({
  logger,
  soClient,
  esClient,
}: {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}) {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    return;
  }

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  const outdatedAgentPolicyIds: string[] = [];

  await pMap(
    agentPolicies,
    async (agentPolicy) => {
      const [latestFleetPolicy] = await Promise.all([
        agentPolicyService.getLatestFleetPolicy(esClient, agentPolicy.id),
        ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient, esClient, agentPolicy.id),
      ]);

      if ((latestFleetPolicy?.revision_idx ?? -1) < agentPolicy.revision) {
        outdatedAgentPolicyIds.push(agentPolicy.id);
      }
    },
    {
      concurrency: 20,
    }
  );

  if (outdatedAgentPolicyIds.length) {
    await agentPolicyService.deployPolicies(soClient, outdatedAgentPolicyIds).catch((error) => {
      logger.warn(`Error deploying policies: ${error.message}`, { error });
    });
  }
}
