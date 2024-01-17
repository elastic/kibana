/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import { agentPolicyService } from '../agent_policy';

/**
 * Ensure a .fleet-policy document exist for each agent policy so Fleet server can retrieve it
 */
export async function ensureFleetServerAgentPoliciesExists({
  soClient,
  esClient,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  const outdatedAgentPolicyIds = agentPolicies
    .filter(
      async (agentPolicy) =>
        (await agentPolicyService.getLatestFleetPolicy(esClient, agentPolicy.id))?.revision_idx ===
        agentPolicy.revision
    )
    .map((agentPolicy) => agentPolicy.id);

  await agentPolicyService.deployPolicies(soClient, outdatedAgentPolicyIds).catch((error) => {
    logger.warn(`Error deploying policies: ${error.message}`, { error });
  });
}
