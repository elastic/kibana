/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';

import type { FleetServerAgentAction, ActionStatus, ListWithKuery } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { appContextService } from '..';

const PRECISION_THRESHOLD = 40000;

/**
 * Return current bulk actions
 */
export async function getActionStatuses(
  esClient: ElasticsearchClient,
  options: ListWithKuery
): Promise<ActionStatus[]> {
  const actions = await _getActions(esClient, options);
  const cancelledActions = await _getCancelledActions(esClient);
  let acks: any;

  try {
    acks = await esClient.search({
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
          terms: { field: 'action_id', size: actions.length || 10 },
          aggs: {
            max_timestamp: { max: { field: '@timestamp' } },
            agent_count: {
              cardinality: {
                field: 'agent_id',
                precision_threshold: PRECISION_THRESHOLD, // max value
              },
            },
          },
        },
      },
    });
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }

  const results = [];

  for (const action of actions) {
    const matchingBucket = (acks?.aggregations?.ack_counts as any)?.buckets?.find(
      (bucket: any) => bucket.key === action.actionId
    );
    const nbAgentsActioned = action.nbAgentsActioned || action.nbAgentsActionCreated;
    const cardinalityCount = (matchingBucket?.agent_count as any)?.value ?? 0;
    const docCount = matchingBucket?.doc_count ?? 0;
    const nbAgentsAck =
      action.type === 'UPDATE_TAGS'
        ? Math.min(docCount, nbAgentsActioned)
        : Math.min(
            docCount,
            // only using cardinality count when count lower than precision threshold
            docCount > PRECISION_THRESHOLD ? docCount : cardinalityCount,
            nbAgentsActioned
          );
    const completionTime = (matchingBucket?.max_timestamp as any)?.value_as_string;
    const complete = nbAgentsAck >= nbAgentsActioned;
    const cancelledAction = cancelledActions.find((a) => a.actionId === action.actionId);

    let errorCount = 0;
    try {
      // query to find errors in action results, cannot do aggregation on text type
      const res = await esClient.search({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        track_total_hits: true,
        rest_total_hits_as_int: true,
        query: {
          bool: {
            must: [{ term: { action_id: action.actionId } }],
            should: [
              {
                exists: {
                  field: 'error',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        size: 0,
      });
      errorCount = (res.hits.total as number) ?? 0;
    } catch (err) {
      if (err.statusCode === 404) {
        // .fleet-actions-results does not yet exist
        appContextService.getLogger().debug(err);
      } else {
        throw err;
      }
    }

    results.push({
      ...action,
      nbAgentsAck: nbAgentsAck - errorCount,
      nbAgentsFailed: errorCount,
      status:
        errorCount > 0 && complete
          ? 'FAILED'
          : complete
          ? 'COMPLETE'
          : cancelledAction
          ? 'CANCELLED'
          : action.status,
      nbAgentsActioned,
      cancellationTime: cancelledAction?.timestamp,
      completionTime,
    });
  }

  return results;
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
    from: options.page ?? 0,
    size: options.perPage ?? 20,
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
        const isExpired =
          source.expiration && source.type !== 'UPGRADE'
            ? Date.parse(source.expiration) < Date.now()
            : false;
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgentsActionCreated: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: source.start_time,
          type: source.type,
          nbAgentsActioned: source.total ?? 0,
          status: isExpired
            ? 'EXPIRED'
            : hasRolloutPeriodPassed(source)
            ? 'ROLLOUT_PASSED'
            : 'IN_PROGRESS',
          expiration: source.expiration,
          newPolicyId: source.data?.policy_id as string,
          creationTime: source['@timestamp']!,
          nbAgentsFailed: 0,
        };
      }

      acc[hit._source.action_id].nbAgentsActionCreated += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: ActionStatus })
  );
}

export const hasRolloutPeriodPassed = (source: FleetServerAgentAction) =>
  source.type === 'UPGRADE' && source.rollout_duration_seconds
    ? Date.now() >
      moment(source.start_time ?? Date.now())
        .add(source.rollout_duration_seconds, 'seconds')
        .valueOf()
    : false;
