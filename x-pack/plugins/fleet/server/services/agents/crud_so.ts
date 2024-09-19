/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsBulkUpdateObject, SavedObjectsClientContract } from 'src/core/server';

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';

import { isAgentUpgradeable } from '../../../common';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import type { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import { escapeSearchQueryPhrase, normalizeKuery, findAllSOs } from '../saved_object';
import { appContextService } from '../../services';

import { savedObjectToAgent } from './saved_objects';

const ACTIVE_AGENT_CONDITION = `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true`;
const INACTIVE_AGENT_CONDITION = `NOT (${ACTIVE_AGENT_CONDITION})`;

function _joinFilters(filters: Array<string | undefined | KueryNode>) {
  return filters
    .filter((filter) => filter !== undefined)
    .reduce(
      (
        acc: KueryNode | undefined,
        kuery: string | KueryNode | undefined
      ): KueryNode | undefined => {
        if (kuery === undefined) {
          return acc;
        }
        const kueryNode: KueryNode =
          typeof kuery === 'string'
            ? fromKueryExpression(normalizeKuery(AGENT_SAVED_OBJECT_TYPE, kuery))
            : kuery;

        if (!acc) {
          return kueryNode;
        }

        return {
          type: 'function',
          function: 'and',
          arguments: [acc, kueryNode],
        };
      },
      undefined as KueryNode | undefined
    );
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
  const filters: Array<string | KueryNode | undefined> = [];

  if (kuery && kuery !== '') {
    filters.push(kuery);
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }
  try {
    let { saved_objects: agentSOs, total } = await soClient.find<AgentSOAttributes>({
      type: AGENT_SAVED_OBJECT_TYPE,
      filter: _joinFilters(filters) || '',
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
  } catch (e) {
    if (e.output?.payload?.message?.startsWith('The key is empty')) {
      return {
        agents: [],
        total: 0,
        page: 0,
        perPage: 0,
      };
    } else {
      throw e;
    }
  }
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
    filters.push(kuery);
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
  data: Partial<AgentSOAttributes>
) {
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, data);
}

export async function bulkUpdateAgents(
  soClient: SavedObjectsClientContract,
  updateData: Array<{
    agentId: string;
    data: Partial<AgentSOAttributes>;
  }>
) {
  const updates: Array<SavedObjectsBulkUpdateObject<AgentSOAttributes>> = updateData.map(
    ({ agentId, data }) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agentId,
      attributes: data,
    })
  );

  const res = await soClient.bulkUpdate<AgentSOAttributes>(updates);

  return {
    items: res.saved_objects.map((so) => ({
      id: so.id,
      success: !so.error,
      error: so.error,
    })),
  };
}

export async function deleteAgent(soClient: SavedObjectsClientContract, agentId: string) {
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    active: false,
  });
}
