/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SearchResponse, MGetResponse, GetResponse } from 'elasticsearch';
import type { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';

import type { AgentSOAttributes, Agent, BulkActionResult, ListWithKuery } from '../../types';
import type { ESSearchResponse } from '../../../../../../typings/elasticsearch';
import { appContextService, agentPolicyService } from '../../services';
import type { FleetServerAgent } from '../../../common';
import { isAgentUpgradeable, SO_SEARCH_LIMIT } from '../../../common';
import { AGENT_SAVED_OBJECT_TYPE, AGENTS_INDEX } from '../../constants';
import { escapeSearchQueryPhrase, normalizeKuery } from '../saved_object';
import type { KueryNode } from '../../../../../../src/plugins/data/server';
import { esKuery } from '../../../../../../src/plugins/data/server';
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

export type GetAgentsOptions =
  | {
      agentIds: string[];
    }
  | {
      kuery: string;
      showInactive?: boolean;
    };

export async function getAgents(esClient: ElasticsearchClient, options: GetAgentsOptions) {
  let agents: Agent[] = [];
  if ('agentIds' in options) {
    agents = await getAgentsById(esClient, options.agentIds);
  } else if ('kuery' in options) {
    agents = (
      await getAllAgentsByKuery(esClient, {
        kuery: options.kuery,
        showInactive: options.showInactive ?? false,
      })
    ).agents;
  } else {
    throw new IngestManagerError(
      'Either options.agentIds or options.kuery are required to get agents'
    );
  }

  return agents;
}

export async function getAgentsByKuery(
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
  const res = await esClient.search<ESSearchResponse<FleetServerAgent, {}>>({
    index: AGENTS_INDEX,
    from: (page - 1) * perPage,
    size: perPage,
    sort: `${sortField}:${sortOrder}`,
    track_total_hits: true,
    body,
  });

  let agents = res.body.hits.hits.map(searchHitToAgent);
  // filtering for a range on the version string will not work,
  // nor does filtering on a flattened field (local_metadata), so filter here
  if (showUpgradeable) {
    agents = agents.filter((agent) =>
      isAgentUpgradeable(agent, appContextService.getKibanaVersion())
    );
  }

  return {
    agents,
    total: res.body.hits.total.value,
    page,
    perPage,
  };
}

export async function getAllAgentsByKuery(
  esClient: ElasticsearchClient,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
}> {
  const res = await getAgentsByKuery(esClient, { ...options, page: 1, perPage: SO_SEARCH_LIMIT });

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

export async function getAgentById(esClient: ElasticsearchClient, agentId: string) {
  const agentNotFoundError = new AgentNotFoundError(`Agent ${agentId} not found`);
  try {
    const agentHit = await esClient.get<ESAgentDocumentResult>({
      index: AGENTS_INDEX,
      id: agentId,
    });

    if (agentHit.body.found === false) {
      throw agentNotFoundError;
    }
    const agent = searchHitToAgent(agentHit.body);

    return agent;
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      throw agentNotFoundError;
    }
    throw err;
  }
}

export function isAgentDocument(
  maybeDocument: any
): maybeDocument is GetResponse<FleetServerAgent> {
  return '_id' in maybeDocument && '_source' in maybeDocument;
}

export type ESAgentDocumentResult = GetResponse<FleetServerAgent>;
export async function getAgentDocuments(
  esClient: ElasticsearchClient,
  agentIds: string[]
): Promise<ESAgentDocumentResult[]> {
  const res = await esClient.mget<MGetResponse<FleetServerAgent>>({
    index: AGENTS_INDEX,
    body: { docs: agentIds.map((_id) => ({ _id })) },
  });

  return res.body.docs || [];
}

export async function getAgentsById(
  esClient: ElasticsearchClient,
  agentIds: string[]
): Promise<Agent[]> {
  const allDocs = await getAgentDocuments(esClient, agentIds);
  const agents = allDocs.reduce<Agent[]>((results, doc) => {
    if (isAgentDocument(doc)) {
      results.push(searchHitToAgent(doc));
    }

    return results;
  }, []);

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

  const agent = searchHitToAgent(res.body.hits.hits[0]);

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
): Promise<{ items: BulkActionResult[] }> {
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
  const agent = await getAgentById(esClient, agentId);
  if (!agent.policy_id) {
    return;
  }

  const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
  if (agentPolicy) {
    return agentPolicy;
  }
}
