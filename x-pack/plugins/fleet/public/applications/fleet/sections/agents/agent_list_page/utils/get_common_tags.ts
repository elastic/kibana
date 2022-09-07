/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';

import type { Agent, AgentPolicy } from '../../../../types';

export const getCommonTags = (
  agents: string | Agent[],
  visibleAgents: Agent[],
  agentPolicies: AgentPolicy[]
): string[] => {
  const isManagedPolicy = (agent: Agent): boolean => {
    const policy = agentPolicies.find((pol) => pol.id === agent.policy_id);
    return !!policy && policy.is_managed;
  };

  const commonSelectedTags = (agentList: Agent[]): string[] =>
    agentList.reduce((acc: string[], curr: Agent) => {
      if (isManagedPolicy(curr)) {
        return acc;
      }
      if (acc.length < 1) {
        return curr.tags ?? [];
      }
      return intersection(curr.tags ?? [], acc);
    }, []);

  if (!Array.isArray(agents)) {
    // in query mode, returning common tags of all agents in current page
    // this is a simplification to avoid querying all agents from backend to determine common tags
    return commonSelectedTags(visibleAgents);
  }
  // taking latest tags from freshly loaded agents data, as selected agents array does not contain the latest tags of agents
  const freshSelectedAgentsData =
    visibleAgents.length > 0
      ? visibleAgents.filter((newAgent) =>
          agents.find((existingAgent) => existingAgent.id === newAgent.id)
        )
      : agents;

  return commonSelectedTags(freshSelectedAgentsData);
};
