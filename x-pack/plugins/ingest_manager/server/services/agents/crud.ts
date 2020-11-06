/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { SavedObjectsClientContract } from 'src/core/server';
import { isAgentUpgradeable } from '../../../common';
import { AGENT_SAVED_OBJECT_TYPE, AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentSOAttributes, Agent, AgentEventSOAttributes, ListWithKuery } from '../../types';
import { escapeSearchQueryPhrase, normalizeKuery, findAllSOs } from '../saved_object';
import { savedObjectToAgent } from './saved_objects';
import { appContextService } from '../../services';

const ACTIVE_AGENT_CONDITION = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true`;
const INACTIVE_AGENT_CONDITION = `NOT (${ACTIVE_AGENT_CONDITION})`;

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}

export async function listAgents(
  soClient: SavedObjectsClientContract,
  options: ListWithKuery & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
  page: number;
  perPage: number;
}> {
  const {
    page = 1,
    perPage = 20,
    sortField = 'enrolled_at',
    sortOrder = 'desc',
    kuery,
    showInactive = false,
    showUpgradeable,
  } = options;
  const filters = [];

  if (kuery && kuery !== '') {
    filters.push(normalizeKuery(AGENT_SAVED_OBJECT_TYPE, kuery));
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  let { saved_objects: agentSOs, total } = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    filter: _joinFilters(filters),
    sortField,
    sortOrder,
    page,
    perPage,
  });
  // filtering for a range on the version string will not work,
  // nor does filtering on a flattened field (local_metadata), so filter here
  if (showUpgradeable) {
    agentSOs = agentSOs.filter((agent) =>
      isAgentUpgradeable(savedObjectToAgent(agent), appContextService.getKibanaVersion())
    );
    total = agentSOs.length;
  }

  return {
    agents: agentSOs.map(savedObjectToAgent),
    total,
    page,
    perPage,
  };
}

export async function listAllAgents(
  soClient: SavedObjectsClientContract,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
}> {
  const { sortField = 'enrolled_at', sortOrder = 'desc', kuery, showInactive = false } = options;
  const filters = [];

  if (kuery && kuery !== '') {
    filters.push(normalizeKuery(AGENT_SAVED_OBJECT_TYPE, kuery));
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  const { saved_objects: agentSOs, total } = await findAllSOs<AgentSOAttributes>(soClient, {
    type: AGENT_SAVED_OBJECT_TYPE,
    kuery: _joinFilters(filters),
    sortField,
    sortOrder,
  });

  return {
    agents: agentSOs.map(savedObjectToAgent),
    total,
  };
}

export async function countInactiveAgents(
  soClient: SavedObjectsClientContract,
  options: Pick<ListWithKuery, 'kuery'>
): Promise<number> {
  const { kuery } = options;
  const filters = [INACTIVE_AGENT_CONDITION];

  if (kuery && kuery !== '') {
    filters.push(normalizeKuery(AGENT_SAVED_OBJECT_TYPE, kuery));
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
