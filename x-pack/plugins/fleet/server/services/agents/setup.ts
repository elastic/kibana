/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import { agentPolicyService } from '../agent_policy';

/**
 * During the migration from 7.9 to 7.10 we introduce a new agent action POLICY_CHANGE per policy
 * this function ensure that action exist for each policy
 *
 * @param soClient
 */
export async function ensureAgentActionPolicyChangeExists(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map(async (agentPolicy) => {
      const policyChangeActionExist = !!(await agentPolicyService.getLatestFleetPolicy(
        esClient,
        agentPolicy.id
      ));

      if (!policyChangeActionExist) {
        return agentPolicyService.createFleetPolicyChangeAction(soClient, agentPolicy.id);
      }
    })
  );
}
