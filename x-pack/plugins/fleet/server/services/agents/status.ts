/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import type { KueryNode } from '@kbn/es-query';
import { toElasticsearchQuery } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';

import type {
  AggregationsTermsAggregateBase,
  AggregationsTermsBucketBase,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

import { AGENTS_INDEX, AGENTS_PREFIX } from '../../constants';
import type { AgentStatus } from '../../types';
import { AgentStatusKueryHelper } from '../../../common/services';
import { FleetUnauthorizedError } from '../../errors';

import { appContextService } from '../app_context';

import { agentPolicyService } from '../agent_policy';

import {
  closePointInTime,
  getAgentById,
  getAgentsByKuery,
  openPointInTime,
  removeSOAttributes,
} from './crud';
import { buildStatusRuntimeQuery } from './build_status_query';

interface AggregationsStatusTermsBucketKeys extends AggregationsTermsBucketBase {
  key: AgentStatus;
}

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';
const MAX_AGENT_DATA_PREVIEW_SIZE = 20;
export async function getAgentStatusById(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentStatus> {
  return (await getAgentById(esClient, agentId)).status!;
}

export const getAgentStatus = AgentStatusKueryHelper.getAgentStatus;

function joinKuerys(...kuerys: Array<string | undefined>) {
  return kuerys
    .filter((kuery) => kuery !== undefined)
    .reduce((acc: KueryNode | undefined, kuery: string | undefined): KueryNode | undefined => {
      if (kuery === undefined) {
        return acc;
      }
      const normalizedKuery: KueryNode = fromKueryExpression(removeSOAttributes(kuery || ''));

      if (!acc) {
        return normalizedKuery;
      }

      return {
        type: 'function',
        function: 'and',
        arguments: [acc, normalizedKuery],
      };
    }, undefined as KueryNode | undefined);
}

export async function getAgentStatusForAgentPolicyExperimental(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const logger = appContextService.getLogger();
  const unenrollTimeouts = await agentPolicyService.getUnenrollTimeouts(soClient);
  const runtimeFields = buildStatusRuntimeQuery(unenrollTimeouts);

  const clauses: QueryDslQueryContainer[] = [];

  if (filterKuery) {
    const kueryAsElasticsearchQuery = toElasticsearchQuery(fromKueryExpression(filterKuery));
    clauses.push(kueryAsElasticsearchQuery);
  }

  if (agentPolicyId) {
    clauses.push({
      term: {
        [`${AGENTS_PREFIX}.policy_id`]: agentPolicyId,
      },
    });
  }

  const query =
    clauses.length > 0
      ? {
          bool: {
            must: clauses,
          },
        }
      : undefined;

  const statuses: Partial<Record<AgentStatus, number>> = {
    online: 0,
    error: 0,
    inactive: 0,
    offline: 0,
    updating: 0,
    unenrolled: 0,
  };

  let response;

  try {
    response = await esClient.search<
      null,
      { status: AggregationsTermsAggregateBase<AggregationsStatusTermsBucketKeys> }
    >({
      index: AGENTS_INDEX,
      size: 0,
      query,
      fields: Object.keys(runtimeFields),
      runtime_mappings: runtimeFields,
      aggregations: {
        status: {
          terms: {
            field: 'calculated_status',
            size: Object.keys(statuses).length,
          },
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting agent statuses: ${error}`);
    throw error;
  }

  const buckets = response?.aggregations?.status?.buckets || [];

  if (!Array.isArray(buckets)) {
    throw new Error('buckets is not an array');
  }

  buckets.forEach((bucket) => {
    if (statuses[bucket.key] !== undefined) {
      statuses[bucket.key] = bucket.doc_count;
    }
  });

  return {
    ...statuses,
    /* @deprecated no agents will have other status */
    other: 0,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
    total: Object.values(statuses).reduce((acc, val) => acc + val, 0),
  };
}

export async function getAgentStatusForAgentPolicy(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const logger = appContextService.getLogger();
  let pitId: string | undefined;
  try {
    pitId = await openPointInTime(esClient);
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug('Index .fleet-agents does not exist yet, skipping point in time.');
    } else {
      throw error;
    }
  }
  const [all, allActive, online, error, offline, updating, unenrolled] = await pMap(
    [
      [undefined, true], // All agents, including inactive
      [undefined], // All active agents
      [AgentStatusKueryHelper.buildKueryForOnlineAgents()],
      [AgentStatusKueryHelper.buildKueryForErrorAgents()],
      [AgentStatusKueryHelper.buildKueryForOfflineAgents()],
      [AgentStatusKueryHelper.buildKueryForUpdatingAgents()],
      [AgentStatusKueryHelper.buildKueryForUnenrolledAgents(), true], // unenrolled agents are inactive
    ],
    ([kuery, showInactive = false]: [kuery?: string, showInactive?: boolean], index) =>
      getAgentsByKuery(esClient, soClient, {
        showInactive,
        perPage: 0,
        page: 1,
        pitId,
        kuery: joinKuerys(
          ...[
            kuery,
            filterKuery,
            agentPolicyId ? `${AGENTS_PREFIX}.policy_id:"${agentPolicyId}"` : undefined,
          ]
        ),
      }),
    {
      concurrency: 1,
    }
  );

  if (pitId) {
    await closePointInTime(esClient, pitId);
  }

  const result = {
    total: allActive.total,
    inactive: all.total - allActive.total - unenrolled.total,
    online: online.total,
    error: error.total,
    offline: offline.total,
    updating: updating.total,
    unenrolled: unenrolled.total,
    other: all.total - online.total - error.total - offline.total,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
  };

  const aggResult = await getAgentStatusForAgentPolicyExperimental(
    esClient,
    soClient,
    agentPolicyId,
    filterKuery
  );

  return { ...result, aggResult };
}
export async function getIncomingDataByAgentsId(
  esClient: ElasticsearchClient,
  agentsIds: string[],
  returnDataPreview: boolean = false
) {
  try {
    const { has_all_requested: hasAllPrivileges } = await esClient.security.hasPrivileges({
      body: {
        index: [
          {
            names: [DATA_STREAM_INDEX_PATTERN],
            privileges: ['read'],
          },
        ],
      },
    });
    if (!hasAllPrivileges) {
      throw new FleetUnauthorizedError('Missing permissions to read data streams indices');
    }

    const searchResult = await esClient.search({
      index: DATA_STREAM_INDEX_PATTERN,
      allow_partial_search_results: true,
      _source: returnDataPreview,
      timeout: '5s',
      size: returnDataPreview ? MAX_AGENT_DATA_PREVIEW_SIZE : 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'agent.id': agentsIds,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          agent_ids: {
            terms: {
              field: 'agent.id',
              size: agentsIds.length,
            },
          },
        },
      },
    });

    if (!searchResult.aggregations?.agent_ids) {
      return {
        items: agentsIds.map((id) => {
          return { items: { [id]: { data: false } } };
        }),
        data: [],
      };
    }

    // @ts-expect-error aggregation type is not specified
    const agentIdsWithData: string[] = searchResult.aggregations.agent_ids.buckets.map(
      (bucket: any) => bucket.key as string
    );

    const dataPreview = searchResult.hits?.hits || [];

    const items = agentsIds.map((id) =>
      agentIdsWithData.includes(id) ? { [id]: { data: true } } : { [id]: { data: false } }
    );

    return { items, dataPreview };
  } catch (e) {
    throw new Error(e);
  }
}
