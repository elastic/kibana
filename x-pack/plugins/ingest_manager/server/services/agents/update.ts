/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { listAgents } from './crud';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { unenrollAgent } from './unenroll';
import { agentConfigService } from '../agent_config';

export async function updateAgentsForConfigId(
  soClient: SavedObjectsClientContract,
  configId: string
) {
  const config = await agentConfigService.get(soClient, configId);
  if (!config) {
    throw new Error('Config not found');
  }
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await listAgents(soClient, {
      kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id:"${configId}"`,
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
      attributes: { config_newest_revision: config.revision },
    }));

    await soClient.bulkUpdate(agentUpdate);
  }
}

export async function unenrollForConfigId(soClient: SavedObjectsClientContract, configId: string) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await listAgents(soClient, {
      kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id:"${configId}"`,
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
