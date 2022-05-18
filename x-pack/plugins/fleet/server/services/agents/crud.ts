/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import type { AgentSOAttributes, Agent, BulkActionResult, ListWithKuery } from '../../types';
import { appContextService, agentPolicyService } from '..';
import type { FleetServerAgent } from '../../../common';
import { isAgentUpgradeable, SO_SEARCH_LIMIT } from '../../../common';
import { AGENTS_PREFIX, AGENTS_INDEX } from '../../constants';
import { escapeSearchQueryPhrase, normalizeKuery } from '../saved_object';
import { IngestManagerError, isESClientError, AgentNotFoundError } from '../../errors';

import { searchHitToAgent, agentSOAttributesToFleetServerAgentDoc } from './helpers';

const ACTIVE_AGENT_CONDITION = 'active:true';
const INACTIVE_AGENT_CONDITION = `NOT (${ACTIVE_AGENT_CONDITION})`;

function _joinFilters(filters: Array<string | undefined | KueryNode>): KueryNode | undefined {
  try {
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
            typeof kuery === 'string' ? fromKueryExpression(removeSOAttributes(kuery)) : kuery;

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
  const body = kueryNode ? { query: toElasticsearchQuery(kueryNode) } : {};
  const queryAgents = async (from: number, size: number) =>
    esClient.search<FleetServerAgent, {}>({
      index: AGENTS_INDEX,
      from,
      size,
      track_total_hits: true,
      rest_total_hits_as_int: true,
      ignore_unavailable: true,
      body: {
        ...body,
        sort: [{ [sortField]: { order: sortOrder } }],
      },
    });
  const res = await queryAgents((page - 1) * perPage, perPage);

  let agents = res.hits.hits.map(searchHitToAgent);
  let total = res.hits.total as number;
  // filtering for a range on the version string will not work,
  // nor does filtering on a flattened field (local_metadata), so filter here
  if (showUpgradeable) {
    // fixing a bug where upgradeable filter was not returning right results https://github.com/elastic/kibana/issues/117329
    // query all agents, then filter upgradeable, and return the requested page and correct total
    // if there are more than SO_SEARCH_LIMIT agents, the logic falls back to same as before
    if (total < SO_SEARCH_LIMIT) {
      const response = await queryAgents(0, SO_SEARCH_LIMIT);
      agents = response.hits.hits
        .map(searchHitToAgent)
        .filter((agent) => isAgentUpgradeable(agent, appContextService.getKibanaVersion()));
      total = agents.length;
      const start = (page - 1) * perPage;
      agents = agents.slice(start, start + perPage);
    } else {
      agents = agents.filter((agent) =>
        isAgentUpgradeable(agent, appContextService.getKibanaVersion())
      );
    }
  }

  return {
    agents,
    total,
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
    filters.push(normalizeKuery(AGENTS_PREFIX, kuery));
  }

  const kueryNode = _joinFilters(filters);
  const body = kueryNode ? { query: toElasticsearchQuery(kueryNode) } : {};

  const res = await esClient.search({
    index: AGENTS_INDEX,
    size: 0,
    track_total_hits: true,
    rest_total_hits_as_int: true,
    filter_path: 'hits.total',
    ignore_unavailable: true,
    body,
  });

  return (res.hits.total as number) || 0;
}

export async function getAgentById(esClient: ElasticsearchClient, agentId: string) {
  const agentNotFoundError = new AgentNotFoundError(`Agent ${agentId} not found`);
  try {
    const agentHit = await esClient.get<FleetServerAgent>({
      index: AGENTS_INDEX,
      id: agentId,
    });

    if (agentHit.found === false) {
      throw agentNotFoundError;
    }

    return searchHitToAgent(agentHit);
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      throw agentNotFoundError;
    }
    throw err;
  }
}

export function isAgentDocument(
  maybeDocument: any
): maybeDocument is estypes.MgetResponseItem<FleetServerAgent> {
  return '_id' in maybeDocument && '_source' in maybeDocument;
}

export type ESAgentDocumentResult = estypes.MgetResponseItem<FleetServerAgent>;

export async function getAgentDocuments(
  esClient: ElasticsearchClient,
  agentIds: string[]
): Promise<ESAgentDocumentResult[]> {
  const res = await esClient.mget<FleetServerAgent>({
    index: AGENTS_INDEX,
    body: { docs: agentIds.map((_id) => ({ _id })) },
  });

  return res.docs || [];
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
  const res = await esClient.search<FleetServerAgent>({
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    q: `access_api_key_id:${escapeSearchQueryPhrase(accessAPIKeyId)}`,
  });

  const searchHit = res.hits.hits[0];
  const agent = searchHit && searchHitToAgent(searchHit);

  if (!searchHit || !agent) {
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
    items: res.items.map((item) => ({
      id: item.update!._id as string,
      success: !item.update!.error,
      // @ts-expect-error it not assignable to ErrorCause
      error: item.update!.error as Error,
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
