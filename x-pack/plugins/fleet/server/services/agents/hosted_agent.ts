/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { agentPolicyService } from '../agent_policy';

export async function getHostedPolicies(
  soClient: SavedObjectsClientContract,
  agents: Agent[]
): Promise<{ [key: string]: boolean }> {
  // get any policy ids from upgradable agents
  const policyIdsToGet = new Set(
    agents.filter((agent) => agent.policy_id).map((agent) => agent.policy_id!)
  );

  // get the agent policies for those ids
  const agentPolicies = await agentPolicyService.getByIDs(soClient, Array.from(policyIdsToGet), {
    fields: ['is_managed'],
    ignoreMissing: true,
  });
  const hostedPolicies = agentPolicies.reduce<Record<string, boolean>>((acc, policy) => {
    acc[policy.id] = policy.is_managed;
    return acc;
  }, {});

  return hostedPolicies;
}

export function isHostedAgent(hostedPolicies: { [key: string]: boolean }, agent: Agent) {
  return agent.policy_id && hostedPolicies[agent.policy_id];
}
