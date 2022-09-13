/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';

import { SO_SEARCH_LIMIT } from '../../constants';

import type { FleetServerAgentAction, ActionStatus } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

/**
 * Return current bulk actions
 */
export async function getActionStatuses(esClient: ElasticsearchClient): Promise<ActionStatus[]> {
  let actions = await _getActions(esClient);
  const cancelledActionIds = await _getCancelledActionId(esClient);

  // Fetch acknowledged result for every action
  actions = await pMap(
    actions,
    async (action) => {
      const { count } = await esClient.count({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            must: [
              {
                term: {
                  action_id: action.actionId,
                },
              },
            ],
          },
        },
      });

      const nbAgentsActioned = action.nbAgentsActioned || action.nbAgentsActionCreated;
      const complete = count === nbAgentsActioned;
      const isCancelled = cancelledActionIds.indexOf(action.actionId) > -1;

      return {
        ...action,
        nbAgentsAck: count,
        status: complete ? 'complete' : isCancelled ? 'cancelled' : action.status,
        nbAgentsActioned,
      };
    },
    { concurrency: 20 }
  );

  return actions;
}

async function _getCancelledActionId(esClient: ElasticsearchClient) {
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
          {
            exists: {
              field: 'agents',
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => hit._source?.data?.target_id as string);
}

async function _getActions(esClient: ElasticsearchClient) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        must_not: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
        must: [
          {
            exists: {
              field: 'agents',
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

      if (!acc[hit._source.action_id]) {
        const startTime = hit._source?.start_time ?? hit._source?.['@timestamp'];
        const isExpired = hit._source?.expiration
          ? Date.parse(hit._source?.expiration) < Date.now()
          : false;
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgentsActionCreated: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime,
          type: hit._source?.type,
          nbAgentsActioned: hit._source?.total ?? 0,
          status: isExpired ? 'expired' : 'in progress',
        };
      }

      acc[hit._source.action_id].nbAgentsActionCreated += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: ActionStatus })
  );
}
