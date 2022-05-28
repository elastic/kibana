/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';

import { AGENTS_PREFIX } from '../../constants';
import type { AgentStatus } from '../../types';
import { AgentStatusKueryHelper } from '../../../common/services';
import { FleetUnauthorizedError } from '../../errors';

import { getAgentById, getAgentsByKuery, removeSOAttributes } from './crud';

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';

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

export async function getAgentStatusForAgentPolicy(
  esClient: ElasticsearchClient,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const [all, allActive, online, error, offline, updating] = await pMap(
    [
      undefined, // All agents, including inactive
      undefined, // All active agents
      AgentStatusKueryHelper.buildKueryForOnlineAgents(),
      AgentStatusKueryHelper.buildKueryForErrorAgents(),
      AgentStatusKueryHelper.buildKueryForOfflineAgents(),
      AgentStatusKueryHelper.buildKueryForUpdatingAgents(),
    ],
    (kuery, index) =>
      getAgentsByKuery(esClient, {
        showInactive: index === 0,
        perPage: 0,
        page: 1,
        kuery: joinKuerys(
          ...[
            kuery,
            filterKuery,
            `${AGENTS_PREFIX}.attributes.active:true`,
            agentPolicyId ? `${AGENTS_PREFIX}.policy_id:"${agentPolicyId}"` : undefined,
          ]
        ),
      }),
    {
      concurrency: 1,
    }
  );

  return {
    total: allActive.total,
    inactive: all.total - allActive.total,
    online: online.total,
    error: error.total,
    offline: offline.total,
    updating: updating.total,
    other: all.total - online.total - error.total - offline.total,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
  };
}
export async function getIncomingDataByAgentsId(
  esClient: ElasticsearchClient,
  agentsIds: string[]
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
      _source: false,
      timeout: '5s',
      size: 0,
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
      return agentsIds.map((id) => {
        return { [id]: { data: false } };
      });
    }

    // @ts-expect-error aggregation type is not specified
    const agentIdsWithData: string[] = searchResult.aggregations.agent_ids.buckets.map(
      (bucket: any) => bucket.key as string
    );

    return agentsIds.map((id) =>
      agentIdsWithData.includes(id) ? { [id]: { data: true } } : { [id]: { data: false } }
    );
  } catch (e) {
    throw new Error(e);
  }
}
