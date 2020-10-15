/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { listAgents } from './crud';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { unenrollAgent } from './unenroll';

export async function unenrollForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  policyId: string
) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await listAgents(soClient, {
      kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:"${policyId}"`,
      page: page++,
      perPage: 1000,
      showInactive: true,
    });

    if (agents.length === 0) {
      hasMore = false;
    }
    for (const agent of agents) {
      await unenrollAgent(soClient, agent.id);
    }
  }
}
