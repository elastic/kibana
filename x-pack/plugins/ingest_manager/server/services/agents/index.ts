/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject } from 'kibana/server';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { Agent, AgentSOAttributes } from '../../types';

// TODO fix
const AGENT_POLLING_THRESHOLD_MS = 30 * 1000;
const AGENT_TYPE_EPHEMERAL = 'ephemeral';

export async function getAgent(soClient: SavedObjectsClientContract, agentId: string) {
  const response = await soClient.get<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId);

  return _savedObjectToAgent(response);
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

  const agents: Agent[] = saved_objects.map(_savedObjectToAgent);

  return {
    agents,
    total,
    page,
    perPage,
  };
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

function _savedObjectToAgent(so: SavedObject<AgentSOAttributes>): Agent {
  if (so.error) {
    throw new Error(so.error.message);
  }

  return {
    id: so.id,
    ...so.attributes,
    // current_error_events: so.attributes.current_error_events
    //   ? JSON.parse(so.attributes.current_error_events)
    //   : [],
    local_metadata: JSON.parse(so.attributes.local_metadata),
    user_provided_metadata: JSON.parse(so.attributes.user_provided_metadata),
  };
}

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}
