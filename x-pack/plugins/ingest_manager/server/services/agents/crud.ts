/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClientContract } from 'kibana/server';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_TYPE_EPHEMERAL,
  AGENT_POLLING_THRESHOLD_MS,
} from '../../constants';
import { AgentSOAttributes, Agent, AgentEventSOAttributes } from '../../types';
import { savedObjectToAgent } from './saved_objects';

export async function listAgents(
  soClient: SavedObjectsClientContract,
  options: {
    page: number;
    perPage: number;
    kuery?: string;
    showInactive: boolean;
  }
) {
  const { page, perPage, kuery, showInactive = false } = options;

  const filters = [];

  if (kuery && kuery !== '') {
    // To ensure users dont need to know about SO data structure...
    filters.push(kuery.replace(/agents\./g, 'agents.attributes.'));
  }

  if (showInactive === false) {
    const agentActiveCondition = `agents.attributes.active:true AND not agents.attributes.type:${AGENT_TYPE_EPHEMERAL}`;
    const recentlySeenEphemeralAgent = `agents.attributes.active:true AND agents.attributes.type:${AGENT_TYPE_EPHEMERAL} AND agents.attributes.last_checkin > ${Date.now() -
      3 * AGENT_POLLING_THRESHOLD_MS}`;
    filters.push(`(${agentActiveCondition}) OR (${recentlySeenEphemeralAgent})`);
  }

  const { saved_objects, total } = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    page,
    perPage,
    filter: _joinFilters(filters),
    ..._getSortFields(),
  });

  const agents: Agent[] = saved_objects.map(savedObjectToAgent);

  return {
    agents,
    total,
    page,
    perPage,
  };
}

export async function getAgent(soClient: SavedObjectsClientContract, agentId: string) {
  const agent = savedObjectToAgent(
    await soClient.get<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId)
  );
  return agent;
}

export async function getAgentByAccessAPIKeyId(
  soClient: SavedObjectsClientContract,
  accessAPIKeyId: string
) {
  const response = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    searchFields: ['access_api_key_id'],
    search: accessAPIKeyId,
  });

  const [agent] = response.saved_objects.map(savedObjectToAgent);

  if (!agent) {
    throw Boom.notFound('Agent not found');
  }
  if (!agent.active) {
    throw Boom.forbidden('Agent inactive');
  }

  return agent;
}

export async function updateAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  data: {
    userProvidedMetatada: any;
  }
) {
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    user_provided_metadata: JSON.stringify(data.userProvidedMetatada),
  });
}

export async function deleteAgent(soClient: SavedObjectsClientContract, agentId: string) {
  const agent = await getAgent(soClient, agentId);
  if (agent.type === 'EPHEMERAL') {
    // Delete events
    let more = true;
    while (more === true) {
      const { saved_objects: events } = await soClient.find<AgentEventSOAttributes>({
        type: AGENT_EVENT_SAVED_OBJECT_TYPE,
        fields: ['id'],
        search: agentId,
        searchFields: ['agent_id'],
        perPage: 1000,
      });
      if (events.length === 0) {
        more = false;
      }
      for (const event of events) {
        await soClient.delete(AGENT_EVENT_SAVED_OBJECT_TYPE, event.id);
      }
    }
    await soClient.delete(AGENT_SAVED_OBJECT_TYPE, agentId);
    return;
  }

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    active: false,
  });
}

function _getSortFields(sortOption?: string) {
  switch (sortOption) {
    case 'ASC':
      return {
        sortField: 'enrolled_at',
        sortOrder: 'ASC',
      };

    case 'DESC':
    default:
      return {
        sortField: 'enrolled_at',
        sortOrder: 'DESC',
      };
  }
}

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}
