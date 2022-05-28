/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import { agentPolicyService } from '../agent_policy';

/**
 * Ensure a .fleet-policy document exist for each agent policy so Fleet server can retrieve it
 */
export async function ensureFleetServerAgentPoliciesExists(
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
        return agentPolicyService.deployPolicy(soClient, agentPolicy.id);
      }
    })
  );
}
