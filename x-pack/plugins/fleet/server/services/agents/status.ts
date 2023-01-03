/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { toElasticsearchQuery } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';

import type {
  AggregationsTermsAggregateBase,
  AggregationsTermsBucketBase,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

import { AGENTS_INDEX } from '../../constants';
import type { AgentStatus } from '../../types';
import { FleetUnauthorizedError } from '../../errors';

import { appContextService } from '../app_context';

import { getAgentById, removeSOAttributes } from './crud';
import { buildAgentStatusRuntimeField } from './build_status_runtime_field';

interface AggregationsStatusTermsBucketKeys extends AggregationsTermsBucketBase {
  key: AgentStatus;
}

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';
const MAX_AGENT_DATA_PREVIEW_SIZE = 20;
export async function getAgentStatusById(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentStatus> {
  return (await getAgentById(esClient, soClient, agentId)).status!;
}

export async function getAgentStatusForAgentPolicy(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const logger = appContextService.getLogger();
  const runtimeFields = await buildAgentStatusRuntimeField(soClient);

  const clauses: QueryDslQueryContainer[] = [];

  if (filterKuery) {
    const kueryAsElasticsearchQuery = toElasticsearchQuery(
      fromKueryExpression(removeSOAttributes(filterKuery))
    );
    clauses.push(kueryAsElasticsearchQuery);
  }

  if (agentPolicyId) {
    clauses.push({
      term: {
        policy_id: agentPolicyId,
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

  const statuses: Record<AgentStatus, number> = {
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
            field: 'status',
            size: Object.keys(statuses).length,
          },
        },
      },
    });
  } catch (error) {
    logger.warn(`Error getting agent statuses: ${error}`);
    throw error;
  }

  const buckets = (response?.aggregations?.status?.buckets ||
    []) as AggregationsStatusTermsBucketKeys[];

  buckets.forEach((bucket) => {
    if (statuses[bucket.key] !== undefined) {
      statuses[bucket.key] = bucket.doc_count;
    }
  });

  const combinedStatuses = {
    online: statuses.online,
    error: statuses.error + statuses.degraded,
    inactive: statuses.inactive,
    offline: statuses.offline,
    updating: statuses.updating + statuses.enrolling + statuses.unenrolling,
    unenrolled: statuses.unenrolled,
  };

  return {
    ...combinedStatuses,
    /* @deprecated no agents will have other status */
    other: 0,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
    total:
      Object.values(statuses).reduce((acc, val) => acc + val, 0) -
      combinedStatuses.unenrolled -
      combinedStatuses.inactive,
  };
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
