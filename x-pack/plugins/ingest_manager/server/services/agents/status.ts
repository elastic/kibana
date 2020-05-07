/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { getAgent, listAgents } from './crud';
import { AGENT_EVENT_SAVED_OBJECT_TYPE, AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentStatus, Agent } from '../../types';

import {
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_TEMPORARY,
  AGENT_TYPE_EPHEMERAL,
} from '../../constants';
import { AgentStatusKueryHelper } from '../../../common/services';

export async function getAgentStatusById(
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentStatus> {
  const agent = await getAgent(soClient, agentId);
  return getAgentStatus(agent);
}

export function getAgentStatus(agent: Agent, now: number = Date.now()): AgentStatus {
  const { type, last_checkin: lastCheckIn } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);
  if (!agent.active) {
    return 'inactive';
  }
  if (agent.current_error_events.length > 0) {
    return 'error';
  }
  switch (type) {
    case AGENT_TYPE_PERMANENT:
      if (intervalsSinceLastCheckIn >= 4) {
        return 'error';
      }
      if (intervalsSinceLastCheckIn >= 2) {
        return 'warning';
      }
    case AGENT_TYPE_TEMPORARY:
      if (intervalsSinceLastCheckIn >= 3) {
        return 'offline';
      }
    case AGENT_TYPE_EPHEMERAL:
      if (intervalsSinceLastCheckIn >= 3) {
        return 'inactive';
      }
  }
  return 'online';
}

export async function getAgentStatusForConfig(
  soClient: SavedObjectsClientContract,
  configId?: string
) {
  const [all, error, offline] = await Promise.all(
    [
      undefined,
      AgentStatusKueryHelper.buildKueryForErrorAgents(),
      AgentStatusKueryHelper.buildKueryForOfflineAgents(),
    ].map(kuery =>
      listAgents(soClient, {
        showInactive: false,
        perPage: 0,
        page: 1,
        kuery: configId
          ? kuery
            ? `(${kuery}) and (${AGENT_SAVED_OBJECT_TYPE}.config_id:"${configId}")`
            : `${AGENT_SAVED_OBJECT_TYPE}.config_id:"${configId}"`
          : kuery,
      })
    )
  );

  return {
    events: await getEventsCount(soClient, configId),
    total: all.total,
    online: all.total - error.total - offline.total,
    error: error.total,
    offline: offline.total,
  };
}

async function getEventsCount(soClient: SavedObjectsClientContract, configId?: string) {
  const { total } = await soClient.find({
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    filter: configId
      ? `${AGENT_EVENT_SAVED_OBJECT_TYPE}.attributes.config_id:"${configId}"`
      : undefined,
    perPage: 0,
    page: 1,
    sortField: 'timestamp',
    sortOrder: 'DESC',
    defaultSearchOperator: 'AND',
  });

  return total;
}
