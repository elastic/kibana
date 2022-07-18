/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';

import type { Agent } from '../../../../types';

export const getCommonTags = (agents: string | Agent[], visibleAgents?: Agent[]): string[] => {
  const commonSelectedTags = (agentList: Agent[]) =>
    agentList.reduce(
      (acc: string[], curr: Agent) =>
        acc.length > 0 ? intersection(curr.tags ?? [], acc) : curr.tags ?? [],
      []
    );

  if (!Array.isArray(agents)) {
    // in query mode, returning common tags of all agents in current page
    // this is a simplification to avoid querying all agents from backend to determine common tags
    return commonSelectedTags(visibleAgents ?? []);
  }
  // taking latest tags from freshly loaded agents data, as selected agents array does not contain the latest tags of agents
  const freshSelectedAgentsData =
    visibleAgents?.filter((newAgent) =>
      agents.find((existingAgent) => existingAgent.id === newAgent.id)
    ) ?? agents;

  return commonSelectedTags(freshSelectedAgentsData);
};
