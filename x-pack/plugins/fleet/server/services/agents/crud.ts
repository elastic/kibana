/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import { appContextService, agentPolicyService } from '..';
import type { AgentStatus, FleetServerAgent } from '../../../common/types';
import { SO_SEARCH_LIMIT } from '../../../common/constants';
import { isAgentUpgradeAvailable } from '../../../common/services';
import { AGENTS_INDEX } from '../../constants';
import {
  FleetError,
  isESClientError,
  AgentNotFoundError,
  FleetUnauthorizedError,
} from '../../errors';

import { auditLoggingService } from '../audit_logging';

import { searchHitToAgent, agentSOAttributesToFleetServerAgentDoc } from './helpers';

import { buildAgentStatusRuntimeField } from './build_status_runtime_field';
import { getLatestAvailableAgentVersion } from './versions';

const INACTIVE_AGENT_CONDITION = `status:inactive OR status:unenrolled`;
const ACTIVE_AGENT_CONDITION = `NOT (${INACTIVE_AGENT_CONDITION})`;

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
    throw new FleetError(`Kuery is malformed: ${err.message}`);
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
      perPage?: number;
    };

export async function getAgents(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions
) {
  let agents: Agent[] = [];
  if ('agentIds' in options) {
    agents = (await getAgentsById(esClient, soClient, options.agentIds)).filter(
      (maybeAgent) => !('notFound' in maybeAgent)
    ) as Agent[];
  } else if ('kuery' in options) {
    agents = (
      await getAllAgentsByKuery(esClient, soClient, {
        kuery: options.kuery,
        showInactive: options.showInactive ?? false,
      })
    ).agents;
  } else {
    throw new FleetError('Either options.agentIds or options.kuery are required to get agents');
  }

  return agents;
}

export async function openPointInTime(
  esClient: ElasticsearchClient,
  index: string = AGENTS_INDEX
): Promise<string> {
  const pitKeepAlive = '10m';
  const pitRes = await esClient.openPointInTime({
    index,
    keep_alive: pitKeepAlive,
  });

  auditLoggingService.writeCustomAuditLog({
    message: `User opened point in time query [index=${index}] [pitId=${pitRes.id}]`,
  });

  return pitRes.id;
}

export async function closePointInTime(esClient: ElasticsearchClient, pitId: string) {
  auditLoggingService.writeCustomAuditLog({
    message: `User closing point in time query [pitId=${pitId}]`,
  });

  try {
    await esClient.closePointInTime({ id: pitId });
  } catch (error) {
    appContextService
      .getLogger()
      .warn(`Error closing point in time with id: ${pitId}. Error: ${error.message}`);
  }
}

export async function getAgentTags(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ListWithKuery & {
    showInactive: boolean;
  }
): Promise<string[]> {
  const { kuery, showInactive = false } = options;
  const filters = [];

  if (kuery && kuery !== '') {
    filters.push(kuery);
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  const kueryNode = _joinFilters(filters);
  const body = kueryNode ? { query: toElasticsearchQuery(kueryNode) } : {};
  const runtimeFields = await buildAgentStatusRuntimeField(soClient);
  try {
    const result = await esClient.search<{}, { tags: { buckets: Array<{ key: string }> } }>({
      index: AGENTS_INDEX,
      size: 0,
      body,
      fields: Object.keys(runtimeFields),
      runtime_mappings: runtimeFields,
      aggs: {
        tags: {
          terms: { field: 'tags', size: SO_SEARCH_LIMIT },
        },
      },
    });
    const buckets = result.aggregations?.tags.buckets;
    return buckets?.map((bucket) => bucket.key) ?? [];
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      return [];
    }
    throw err;
  }
}

export function getElasticsearchQuery(
  kuery: string,
  showInactive = false,
  includeHosted = false,
  hostedPolicies: string[] = [],
  extraFilters: string[] = []
): estypes.QueryDslQueryContainer | undefined {
  const filters = [];

  if (kuery && kuery !== '') {
    filters.push(kuery);
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  if (!includeHosted && hostedPolicies.length > 0) {
    filters.push('NOT (policy_id:{policyIds})'.replace('{policyIds}', hostedPolicies.join(',')));
  }

  filters.push(...extraFilters);

  const kueryNode = _joinFilters(filters);
  return kueryNode ? toElasticsearchQuery(kueryNode) : undefined;
}

export async function getAgentsByKuery(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: ListWithKuery & {
    showInactive: boolean;
    getStatusSummary?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    pitId?: string;
    searchAfter?: SortResults;
    aggregations?: Record<string, AggregationsAggregationContainer>;
  }
): Promise<{
  agents: Agent[];
  total: number;
  page: number;
  perPage: number;
  statusSummary?: Record<AgentStatus, number>;
  aggregations?: Record<string, estypes.AggregationsAggregate>;
}> {
  const {
    page = 1,
    perPage = 20,
    sortField = options.sortField ?? 'enrolled_at',
    sortOrder = options.sortOrder ?? 'desc',
    kuery,
    showInactive = false,
    getStatusSummary = false,
    showUpgradeable,
    searchAfter,
    pitId,
    aggregations,
  } = options;
  const filters = [];

  if (kuery && kuery !== '') {
    filters.push(kuery);
  }

  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }

  const kueryNode = _joinFilters(filters);

  const runtimeFields = await buildAgentStatusRuntimeField(soClient);

  const isDefaultSort = sortField === 'enrolled_at' && sortOrder === 'desc';
  // if using default sorting (enrolled_at), adding a secondary sort on hostname, so that the results are not changing randomly in case many agents were enrolled at the same time
  const secondarySort: estypes.Sort = isDefaultSort
    ? [{ 'local_metadata.host.hostname.keyword': { order: 'asc' } }]
    : [];

  const statusSummary: Record<AgentStatus, number> = {
    online: 0,
    error: 0,
    inactive: 0,
    offline: 0,
    updating: 0,
    unenrolled: 0,
    degraded: 0,
    enrolling: 0,
    unenrolling: 0,
  };

  const queryAgents = async (from: number, size: number) => {
    const aggs = {
      ...(aggregations || getStatusSummary
        ? {
            aggs: {
              ...(aggregations ? aggregations : {}),
              ...(getStatusSummary
                ? {
                    status: {
                      terms: {
                        field: 'status',
                      },
                    },
                  }
                : {}),
            },
          }
        : {}),
    };

    return esClient.search<
      FleetServerAgent,
      { status: { buckets: Array<{ key: AgentStatus; doc_count: number }> } }
    >({
      from,
      size,
      track_total_hits: true,
      rest_total_hits_as_int: true,
      runtime_mappings: runtimeFields,
      fields: Object.keys(runtimeFields),
      sort: [{ [sortField]: { order: sortOrder } }, ...secondarySort],
      query: kueryNode ? toElasticsearchQuery(kueryNode) : undefined,
      ...(pitId
        ? {
            pit: {
              id: pitId,
              keep_alive: '1m',
            },
          }
        : {
            index: AGENTS_INDEX,
            ignore_unavailable: true,
          }),
      ...(pitId && searchAfter ? { search_after: searchAfter, from: 0 } : {}),
      ...aggs,
    });
  };
  let res;
  try {
    res = await queryAgents((page - 1) * perPage, perPage);
  } catch (err) {
    appContextService.getLogger().error(`Error getting agents by kuery: ${JSON.stringify(err)}`);
    throw err;
  }

  let agents = res.hits.hits.map(searchHitToAgent);
  let total = res.hits.total as number;
  // filtering for a range on the version string will not work,
  // nor does filtering on a flattened field (local_metadata), so filter here
  if (showUpgradeable) {
    const latestAgentVersion = await getLatestAvailableAgentVersion();
    // fixing a bug where upgradeable filter was not returning right results https://github.com/elastic/kibana/issues/117329
    // query all agents, then filter upgradeable, and return the requested page and correct total
    // if there are more than SO_SEARCH_LIMIT agents, the logic falls back to same as before
    if (total < SO_SEARCH_LIMIT) {
      const response = await queryAgents(0, SO_SEARCH_LIMIT);
      agents = response.hits.hits
        .map(searchHitToAgent)
        .filter((agent) => isAgentUpgradeAvailable(agent, latestAgentVersion));
      total = agents.length;
      const start = (page - 1) * perPage;
      agents = agents.slice(start, start + perPage);
    } else {
      agents = agents.filter((agent) => isAgentUpgradeAvailable(agent, latestAgentVersion));
    }
  }

  if (getStatusSummary) {
    if (showUpgradeable) {
      // when showUpgradeable is selected, calculate the summary status manually from the upgradeable agents above
      // the bucket count doesn't take in account the upgradeable agents
      agents.forEach((agent) => {
        if (!agent?.status) return;
        if (!statusSummary[agent.status]) statusSummary[agent.status] = 0;
        statusSummary[agent.status]++;
      });
    } else {
      res.aggregations?.status.buckets.forEach((bucket) => {
        statusSummary[bucket.key] = bucket.doc_count;
      });
    }
  }

  return {
    agents,
    total,
    page,
    perPage,
    ...(aggregations ? { aggregations: res.aggregations } : {}),
    ...(getStatusSummary ? { statusSummary } : {}),
  };
}

export async function getAllAgentsByKuery(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
}> {
  const res = await getAgentsByKuery(esClient, soClient, {
    ...options,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  return {
    agents: res.agents,
    total: res.total,
  };
}

export async function getAgentById(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string
) {
  const [agentHit] = await getAgentsById(esClient, soClient, [agentId]);

  if ('notFound' in agentHit) {
    throw new AgentNotFoundError(`Agent ${agentId} not found`);
  }

  return agentHit;
}

async function _filterAgents(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  query: estypes.QueryDslQueryContainer,
  options: {
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  agents: Agent[];
  total: number;
  page: number;
  perPage: number;
}> {
  const { page = 1, perPage = 20, sortField = 'enrolled_at', sortOrder = 'desc' } = options;
  const runtimeFields = await buildAgentStatusRuntimeField(soClient);

  let res;
  try {
    res = await esClient.search<FleetServerAgent, {}>({
      from: (page - 1) * perPage,
      size: perPage,
      track_total_hits: true,
      rest_total_hits_as_int: true,
      runtime_mappings: runtimeFields,
      fields: Object.keys(runtimeFields),
      sort: [{ [sortField]: { order: sortOrder } }],
      query: { bool: { filter: query } },
      index: AGENTS_INDEX,
      ignore_unavailable: true,
    });
  } catch (err) {
    appContextService.getLogger().error(`Error querying agents: ${JSON.stringify(err)}`);
    throw err;
  }

  const agents = res.hits.hits.map(searchHitToAgent);
  const total = res.hits.total as number;

  return {
    agents,
    total,
    page,
    perPage,
  };
}

export async function getAgentsById(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentIds: string[]
): Promise<Array<Agent | { id: string; notFound: true }>> {
  if (!agentIds.length) {
    return [];
  }

  const idsQuery = {
    terms: {
      _id: agentIds,
    },
  };
  const { agents } = await _filterAgents(esClient, soClient, idsQuery, {
    perPage: agentIds.length,
  });

  // return agents in the same order as agentIds
  return agentIds.map(
    (agentId) => agents.find((agent) => agent.id === agentId) || { id: agentId, notFound: true }
  );
}

// given a list of agentPolicyIds, return a map of agent version => count of agents
// this is used to get all fleet server versions
export async function getAgentVersionsForAgentPolicyIds(
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<Record<string, number>> {
  const versionCount: Record<string, number> = {};

  if (!agentPolicyIds.length) {
    return versionCount;
  }

  try {
    const res = esClient.search<
      FleetServerAgent,
      Record<'agent_versions', { buckets: Array<{ key: string; doc_count: number }> }>
    >({
      size: 0,
      track_total_hits: false,
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: {
                  policy_id: agentPolicyIds,
                },
              },
            ],
          },
        },
        aggs: {
          agent_versions: {
            terms: {
              field: 'local_metadata.elastic.agent.version.keyword',
              size: 1000,
            },
          },
        },
      },
      index: AGENTS_INDEX,
      ignore_unavailable: true,
    });

    const { aggregations } = await res;

    if (aggregations && aggregations.agent_versions) {
      aggregations.agent_versions.buckets.forEach((bucket) => {
        versionCount[bucket.key] = bucket.doc_count;
      });
    }
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  return versionCount;
}

export async function getAgentByAccessAPIKeyId(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  accessAPIKeyId: string
): Promise<Agent> {
  const query = {
    term: {
      access_api_key_id: accessAPIKeyId,
    },
  };
  const { agents } = await _filterAgents(esClient, soClient, query);

  const agent = agents.length ? agents[0] : null;

  if (!agent) {
    throw new AgentNotFoundError('Agent not found');
  }
  if (agent.access_api_key_id !== accessAPIKeyId) {
    throw new FleetError('Agent api key id is not matching');
  }
  if (!agent.active) {
    throw new FleetUnauthorizedError('Agent inactive');
  }

  return agent;
}

export async function updateAgent(
  esClient: ElasticsearchClient,
  agentId: string,
  data: Partial<AgentSOAttributes>
) {
  auditLoggingService.writeCustomAuditLog({
    message: `User updated agent [id=${agentId}]`,
  });

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
  }>,
  errors: { [key: string]: Error }
): Promise<void> {
  if (updateData.length === 0) {
    return;
  }

  const body = updateData.flatMap(({ agentId, data }) => [
    {
      update: {
        _id: agentId,
        retry_on_conflict: 5,
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

  res.items
    .filter((item) => item.update!.error)
    .forEach((item) => {
      // @ts-expect-error it not assignable to ErrorCause
      errors[item.update!._id as string] = item.update!.error as Error;
    });
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

async function _getAgentDocById(esClient: ElasticsearchClient, agentId: string) {
  try {
    const res = await esClient.get<FleetServerAgent>({
      id: agentId,
      index: AGENTS_INDEX,
    });

    if (!res._source) {
      throw new AgentNotFoundError(`Agent ${agentId} not found`);
    }
    return res._source;
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      throw new AgentNotFoundError(`Agent ${agentId} not found`);
    }
    throw err;
  }
}

export async function getAgentPolicyForAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await _getAgentDocById(esClient, agentId);
  if (!agent.policy_id) {
    return;
  }

  const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
  if (agentPolicy) {
    return agentPolicy;
  }
}
