/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';

import type { FleetServerAgentAction, ActionStatus, ListWithKuery } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

/**
 * Return current bulk actions
 */
export async function getActionStatuses(
  esClient: ElasticsearchClient,
  options: ListWithKuery
): Promise<ActionStatus[]> {
  const actions = await _getActions(esClient, options);
  const cancelledActions = await _getCancelledActions(esClient);

  const acks = await esClient.search({
    index: AGENT_ACTIONS_RESULTS_INDEX,
    query: {
      bool: {
        // There's some perf/caching advantages to using filter over must
        // See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html#filter-context
        filter: [{ terms: { action_id: actions.map((a) => a.actionId) } }],
      },
    },
    size: 0,
    aggs: {
      ack_counts: {
        terms: { field: 'action_id' },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
    },
  });

  return actions.map((action) => {
    const matchingBucket = (acks.aggregations?.ack_counts as any).buckets?.find(
      (b: any) => b.key === action.actionId
    );
    const nbAgentsAck = matchingBucket?.doc_count ?? 0;
    const completionTime = (matchingBucket?.max_timestamp as any)?.value_as_string;
    const nbAgentsActioned = action.nbAgentsActioned || action.nbAgentsActionCreated;
    const complete = nbAgentsAck === nbAgentsActioned;
    const cancelledAction = cancelledActions.find((a) => a.actionId === action.actionId);

    return {
      ...action,
      nbAgentsAck,
      status: complete ? 'complete' : cancelledAction ? 'cancelled' : action.status,
      nbAgentsActioned,
      cancellationTime: cancelledAction?.timestamp,
      completionTime: complete ? completionTime : undefined,
    };
  });
}

async function _getCancelledActions(
  esClient: ElasticsearchClient
): Promise<Array<{ actionId: string; timestamp?: string }>> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => ({
    actionId: hit._source?.data?.target_id as string,
    timestamp: hit._source?.['@timestamp'],
  }));
}

async function _getActions(
  esClient: ElasticsearchClient,
  options: ListWithKuery
): Promise<ActionStatus[]> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    from: options.page ?? 1,
    size: options.perPage ?? 10,
    query: {
      bool: {
        must_not: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
      },
    },
    body: {
      sort: [{ '@timestamp': 'desc' }],
    },
  });

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      const source = hit._source!;

      if (!acc[source.action_id!]) {
        const isExpired = source.expiration ? Date.parse(source.expiration) < Date.now() : false;
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgentsActionCreated: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: source.start_time,
          type: source.type,
          nbAgentsActioned: source.total ?? 0,
          status: isExpired ? 'expired' : 'in progress',
          expiration: source.expiration,
          newPolicyId: source.data?.policy_id as string,
          creationTime: source['@timestamp']!,
        };
      }

      acc[hit._source.action_id].nbAgentsActionCreated += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: ActionStatus })
  );
}
