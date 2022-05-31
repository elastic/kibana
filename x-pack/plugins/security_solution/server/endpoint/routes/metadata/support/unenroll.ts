/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient } from '@kbn/fleet-plugin/server';
import { Agent } from '@kbn/fleet-plugin/common/types/models';

export async function findAllUnenrolledAgentIds(
  agentClient: AgentClient,
  endpointPolicyIds: string[],
  pageSize: number = 1000
): Promise<string[]> {
  // We want:
  // 1.  if no endpoint policies exist, then get all Agents
  // 2.  if we have a list of agent policies, then Agents that are Active and that are
  //      NOT enrolled with an Agent Policy that has endpoint
  const kuery =
    endpointPolicyIds.length > 0
      ? `(active : false) OR (active: true AND NOT policy_id:("${endpointPolicyIds.join(
          '" OR "'
        )}"))`
      : undefined;

  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery,
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const unenrolledAgents = await agentClient.listAgents(searchOptions(page++));
    result.push(...unenrolledAgents.agents.map((agent: Agent) => agent.id));
    hasMore = unenrolledAgents.agents.length > 0;
  }
  return result;
}
