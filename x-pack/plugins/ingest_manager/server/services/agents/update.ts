/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { listAgents } from './crud';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { unenrollAgents } from './unenroll';

export async function updateAgentsForConfigId(
  soClient: SavedObjectsClientContract,
  configId: string
) {
  let hasMore = true;
  let page = 1;
  const now = new Date().toISOString();
  while (hasMore) {
    const { agents } = await listAgents(soClient, {
      kuery: `agents.config_id:"${configId}"`,
      page: page++,
      perPage: 1000,
      showInactive: true,
    });
    if (agents.length === 0) {
      hasMore = false;
      break;
    }
    const agentUpdate = agents.map(agent => ({
      id: agent.id,
      type: AGENT_SAVED_OBJECT_TYPE,
      attributes: { config_updated_at: now },
    }));

    await soClient.bulkUpdate(agentUpdate);
  }
}

export async function unenrollForConfigId(soClient: SavedObjectsClientContract, configId: string) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await listAgents(soClient, {
      kuery: `agents.config_id:"${configId}"`,
      page: page++,
      perPage: 1000,
      showInactive: true,
    });

    if (agents.length === 0) {
      hasMore = false;
    }
    await unenrollAgents(
      soClient,
      agents.map(a => a.id)
    );
  }
}
