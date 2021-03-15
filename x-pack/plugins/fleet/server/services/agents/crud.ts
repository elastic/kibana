/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SearchResponse } from 'elasticsearch';
import type { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';

import type { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import { appContextService, agentPolicyService } from '../../services';
import { FleetServerAgent, isAgentUpgradeable, SO_SEARCH_LIMIT } from '../../../common';
import { AGENT_SAVED_OBJECT_TYPE, AGENTS_INDEX } from '../../constants';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { escapeSearchQueryPhrase, normalizeKuery } from '../saved_object';
import { esKuery, KueryNode } from '../../../../../../src/plugins/data/server';
import { IngestManagerError, isESClientError, AgentNotFoundError } from '../../errors';

import { searchHitToAgent, agentSOAttributesToFleetServerAgentDoc } from './helpers';

const ACTIVE_AGENT_CONDITION = 'active:true';
const INACTIVE_AGENT_CONDITION = `NOT (${ACTIVE_AGENT_CONDITION})`;

function _joinFilters(filters: Array<string | undefined | KueryNode>): KueryNode | undefined {
  try {
    return filters
      .filter((filter) => filter !== undefined)
      .reduce((acc: KueryNode | undefined, kuery: string | KueryNode | undefined):
        | KueryNode
        | undefined => {
        if (kuery === undefined) {
          return acc;
        }
        const kueryNode: KueryNode =
          typeof kuery === 'string'
            ? esKuery.fromKueryExpression(removeSOAttributes(kuery))
            : kuery;

        if (!acc) {
          return kueryNode;
        }

        return {
          type: 'function',
          function: 'and',
          arguments: [acc, kueryNode],
        };
      }, undefined as KueryNode | undefined);
  } catch (err) {
    throw new IngestManagerError(`Kuery is malformed: ${err.message}`);
  }
}

export function removeSOAttributes(kuery: string) {
  return kuery.replace(/attributes\./g, '').replace(/fleet-agents\./g, '');
}

export async function listAgents(
  esClient: ElasticsearchClient,
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
    filters.push(kuery);
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  const kueryNode = _joinFilters(filters);
  const body = kueryNode ? { query: esKuery.toElasticsearchQuery(kueryNode) } : {};

  const res = await esClient.search({
    index: AGENTS_INDEX,
    from: (page - 1) * perPage,
    size: perPage,
    sort: `${sortField}:${sortOrder}`,
    track_total_hits: true,
    body,
  });

  let agentResults: Agent[] = res.body.hits.hits.map(searchHitToAgent);
  let total = res.body.hits.total.value;

  // filtering for a range on the version string will not work,
  // nor does filtering on a flattened field (local_metadata), so filter here
  if (showUpgradeable) {
    agentResults = agentResults.filter((agent) =>
      isAgentUpgradeable(agent, appContextService.getKibanaVersion())
    );
    total = agentResults.length;
  }

  return {
    agents: res.body.hits.hits.map(searchHitToAgent),
    total,
    page,
    perPage,
  };
}

export async function listAllAgents(
  esClient: ElasticsearchClient,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
}> {
  const res = await listAgents(esClient, { ...options, page: 1, perPage: SO_SEARCH_LIMIT });

  return {
    agents: res.agents,
    total: res.total,
  };
}

export async function countInactiveAgents(
  esClient: ElasticsearchClient,
  options: Pick<ListWithKuery, 'kuery'>
): Promise<number> {
  const { kuery } = options;
  const filters = [INACTIVE_AGENT_CONDITION];

  if (kuery && kuery !== '') {
    filters.push(normalizeKuery(AGENT_SAVED_OBJECT_TYPE, kuery));
  }

  const kueryNode = _joinFilters(filters);
  const body = kueryNode ? { query: esKuery.toElasticsearchQuery(kueryNode) } : {};

  const res = await esClient.search({
    index: AGENTS_INDEX,
    size: 0,
    track_total_hits: true,
    body,
  });
  return res.body.hits.total.value;
}

export async function getAgent(esClient: ElasticsearchClient, agentId: string) {
  try {
    const agentHit = await esClient.get<ESSearchHit<FleetServerAgent>>({
      index: AGENTS_INDEX,
      id: agentId,
    });
    const agent = searchHitToAgent(agentHit.body);

    return agent;
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      throw new AgentNotFoundError(`Agent ${agentId} not found`);
    }
    throw err;
  }
}

export async function getAgents(
  esClient: ElasticsearchClient,
  agentIds: string[]
): Promise<Agent[]> {
  const body = { docs: agentIds.map((_id) => ({ _id })) };

  const res = await esClient.mget({
    body,
    index: AGENTS_INDEX,
  });
  const agents = res.body.docs.map(searchHitToAgent);
  return agents;
}

export async function getAgentByAccessAPIKeyId(
  esClient: ElasticsearchClient,
  accessAPIKeyId: string
): Promise<Agent> {
  const res = await esClient.search<SearchResponse<FleetServerAgent>>({
    index: AGENTS_INDEX,
    q: `access_api_key_id:${escapeSearchQueryPhrase(accessAPIKeyId)}`,
  });

  const [agent] = res.body.hits.hits.map(searchHitToAgent);

  if (!agent) {
    throw new AgentNotFoundError('Agent not found');
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
  esClient: ElasticsearchClient,
  agentId: string,
  data: Partial<AgentSOAttributes>
) {
  await esClient.update({
    id: agentId,
    index: AGENTS_INDEX,
    body: { doc: agentSOAttributesToFleetServerAgentDoc(data) },
    refresh: 'wait_for',
  });
}

export async function bulkUpdateAgents(
  esClient: ElasticsearchClient,
  updateData: Array<{
    agentId: string;
    data: Partial<AgentSOAttributes>;
  }>
) {
  if (updateData.length === 0) {
    return { items: [] };
  }

  const body = updateData.flatMap(({ agentId, data }) => [
    {
      update: {
        _id: agentId,
      },
    },
    {
      doc: { ...agentSOAttributesToFleetServerAgentDoc(data) },
    },
  ]);

  const res = await esClient.bulk({
    body,
    index: AGENTS_INDEX,
    refresh: 'wait_for',
  });

  return {
    items: res.body.items.map((item: { update: { _id: string; error?: Error } }) => ({
      id: item.update._id,
      success: !item.update.error,
      error: item.update.error,
    })),
  };
}

export async function deleteAgent(esClient: ElasticsearchClient, agentId: string) {
  try {
    await esClient.update({
      id: agentId,
      index: AGENTS_INDEX,
      body: {
        doc: { active: false },
      },
    });
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      throw new AgentNotFoundError('Agent not found');
    }
    throw err;
  }
}

export async function getAgentPolicyForAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await getAgent(esClient, agentId);
  if (!agent.policy_id) {
    return;
  }

  const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
  if (agentPolicy) {
    return agentPolicy;
  }
}
