/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClientContract } from 'src/core/server';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_TYPE_EPHEMERAL,
  AGENT_POLLING_THRESHOLD_MS,
} from '../../constants';
import { AgentSOAttributes, Agent, AgentEventSOAttributes, ListWithKuery } from '../../types';
import { savedObjectToAgent } from './saved_objects';
import { escapeSearchQueryPhrase } from '../saved_object';

export async function listAgents(
  soClient: SavedObjectsClientContract,
  options: ListWithKuery & {
    showInactive: boolean;
  }
) {
  const {
    page = 1,
    perPage = 20,
    sortField = 'enrolled_at',
    sortOrder = 'desc',
    kuery,
    showInactive = false,
  } = options;

  const filters = [];

  if (kuery && kuery !== '') {
    // To ensure users dont need to know about SO data structure...
    filters.push(
      kuery.replace(
        new RegExp(`${AGENT_SAVED_OBJECT_TYPE}\.`, 'g'),
        `${AGENT_SAVED_OBJECT_TYPE}.attributes.`
      )
    );
  }

  if (showInactive === false) {
    const agentActiveCondition = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true AND not ${AGENT_SAVED_OBJECT_TYPE}.attributes.type:${AGENT_TYPE_EPHEMERAL}`;
    const recentlySeenEphemeralAgent = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true AND ${AGENT_SAVED_OBJECT_TYPE}.attributes.type:${AGENT_TYPE_EPHEMERAL} AND ${AGENT_SAVED_OBJECT_TYPE}.attributes.last_checkin > ${
      Date.now() - 3 * AGENT_POLLING_THRESHOLD_MS
    }`;
    filters.push(`(${agentActiveCondition}) OR (${recentlySeenEphemeralAgent})`);
  }

  const { saved_objects, total } = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    sortField,
    sortOrder,
    page,
    perPage,
    filter: _joinFilters(filters),
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
): Promise<Agent> {
  const response = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    searchFields: ['access_api_key_id'],
    search: escapeSearchQueryPhrase(accessAPIKeyId),
  });
  const [agent] = response.saved_objects.map(savedObjectToAgent);

  if (!agent) {
    throw Boom.notFound('Agent not found');
  }
  if (agent.access_api_key_id !== accessAPIKeyId) {
    throw new Error('Agent api key id is not matching');
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
    user_provided_metadata: data.userProvidedMetatada,
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

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}
