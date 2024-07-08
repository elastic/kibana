/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { getAgentCountForAgentPolicies } from '../agent_policies/agent_policy_agent_count';

import type { PackagePolicy } from '../../../common';

/**
 * Mutates each of the Package Policies passed on input and adds `agents` property to it with the
 * count of agents currently using the given agent policy.
 * @param esClient
 * @param packagePolicies
 */
export const populatePackagePolicyAssignedAgentsCount = async (
  esClient: ElasticsearchClient,
  packagePolicies: PackagePolicy[]
): Promise<void> => {
  const agentPolicyIds = Array.from(
    new Set<string>(packagePolicies.flatMap((policy) => policy.policy_ids))
  );

  const agentPolicyAgentCounts = await getAgentCountForAgentPolicies(esClient, agentPolicyIds);

  for (const packagePolicy of packagePolicies) {
    packagePolicy.agents = packagePolicy.policy_ids.reduce((acc, curr) => {
      acc += agentPolicyAgentCounts[curr] ?? 0;
      return acc;
    }, 0);
  }
};
