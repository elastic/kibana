/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObjectsClientContract, SavedObjectsFindResult } from 'src/core/server';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_TYPE_EPHEMERAL,
  AGENT_POLLING_THRESHOLD_MS,
} from '../../constants';
import { AgentSOAttributes, Agent, AgentEventSOAttributes, ListWithKuery } from '../../types';
import { savedObjectToAgent } from './saved_objects';
import { escapeSearchQueryPhrase } from '../saved_object';

type ListAgentsResponse<P extends boolean> = P extends false
  ? {
      agents: Agent[];
      total: number;
    }
  : {
      agents: Agent[];
      total: number;
      page: number;
      perPage: number;
    };

const AGENT_ACTIVE_CONDITITON = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true AND not ${AGENT_SAVED_OBJECT_TYPE}.attributes.type:${AGENT_TYPE_EPHEMERAL}`;
const RECENTLY_SEEN_EPHEMERAL_AGENT_CONDITION = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true AND ${AGENT_SAVED_OBJECT_TYPE}.attributes.type:${AGENT_TYPE_EPHEMERAL} AND ${AGENT_SAVED_OBJECT_TYPE}.attributes.last_checkin > ${
  Date.now() - 3 * AGENT_POLLING_THRESHOLD_MS
}`;
const ACTIVE_AGENT_CONDITION = `(${AGENT_ACTIVE_CONDITITON}) OR (${RECENTLY_SEEN_EPHEMERAL_AGENT_CONDITION})`;
const INACTIVE_AGENT_CONDITION = `NOT (${ACTIVE_AGENT_CONDITION})`;

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}

export async function listAgents<P extends boolean>(
  soClient: SavedObjectsClientContract,
  options: ListWithKuery & {
    usePagination?: boolean;
    showInactive: boolean;
  }
): Promise<ListAgentsResponse<P>> {
  const {
    page = 1,
    perPage = 20,
    sortField = 'enrolled_at',
    sortOrder = 'desc',
    kuery,
    usePagination = true,
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
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  let agentSOs: Array<SavedObjectsFindResult<AgentSOAttributes>> = [];

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { saved_objects, total } = await soClient.find<AgentSOAttributes>(
    usePagination
      ? {
          type: AGENT_SAVED_OBJECT_TYPE,
          filter: _joinFilters(filters),
          sortField,
          sortOrder,
          page,
          perPage,
        }
      : {
          type: AGENT_SAVED_OBJECT_TYPE,
          filter: _joinFilters(filters),
          page: 1,
          perPage: 10000,
        }
  );

  agentSOs = saved_objects;

  // If not using pagination and we have more than 10000 agents found,
  // page through rest of results and return all found agents
  if (!usePagination && total > 10000) {
    const remainingPages = Math.ceil((total - 10000) / 10000);
    for (let currentPage = 2; currentPage <= remainingPages + 1; currentPage++) {
      const pageResult = await soClient.find<AgentSOAttributes>({
        type: AGENT_SAVED_OBJECT_TYPE,
        filter: _joinFilters(filters),
        page: currentPage,
        perPage: 10000,
      });
      agentSOs = [...agentSOs, ...pageResult.saved_objects];
    }
  }

  const agents: Agent[] = agentSOs.map(savedObjectToAgent);

  const response = usePagination
    ? ({
        agents,
        total,
        page,
        perPage,
      } as ListAgentsResponse<P>)
    : ({
        agents,
        total,
      } as ListAgentsResponse<P>);

  return response;
}

export async function countInactiveAgents(
  soClient: SavedObjectsClientContract,
  options: Pick<ListWithKuery, 'kuery'>
): Promise<number> {
  const { kuery } = options;
  const filters = [INACTIVE_AGENT_CONDITION];

  if (kuery && kuery !== '') {
    // To ensure users dont need to know about SO data structure...
    filters.push(
      kuery.replace(
        new RegExp(`${AGENT_SAVED_OBJECT_TYPE}\.`, 'g'),
        `${AGENT_SAVED_OBJECT_TYPE}.attributes.`
      )
    );
  }

  const { total } = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    filter: _joinFilters(filters),
    perPage: 0,
  });

  return total;
}

export async function getAgent(soClient: SavedObjectsClientContract, agentId: string) {
  const agent = savedObjectToAgent(
    await soClient.get<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId)
  );
  return agent;
}

export async function getAgents(soClient: SavedObjectsClientContract, agentIds: string[]) {
  const agentSOs = await soClient.bulkGet<AgentSOAttributes>(
    agentIds.map((agentId) => ({
      id: agentId,
      type: AGENT_SAVED_OBJECT_TYPE,
    }))
  );
  const agents = agentSOs.saved_objects.map(savedObjectToAgent);
  return agents;
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
