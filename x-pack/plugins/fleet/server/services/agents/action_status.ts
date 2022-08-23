/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';

import type { FleetServerAgentAction, CurrentAction } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

/**
 * Return current bulk actions
 */
export async function getActionStatuses(esClient: ElasticsearchClient): Promise<CurrentAction[]> {
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

      const total = action.total || action.nbAgents;
      const complete = count === total;

      return {
        ...action,
        nbAgentsAck: count,
        complete,
        total,
        timedOut: !complete && action.timedOut,
        failed: total - action.nbAgents,
        cancelled: cancelledActionIds.indexOf(action.actionId) > -1,
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
  });

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      if (!acc[hit._source.action_id]) {
        const startTime = hit._source?.start_time ?? hit._source?.['@timestamp'];
        const timedOut = new Date().getTime() - new Date(startTime || 0).getTime() > 5 * 60 * 1000; // 5 min timeout
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgents: 0,
          complete: false,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime,
          type: hit._source?.type,
          total: hit._source?.total ?? 0,
          failed: 0,
          timedOut,
          cancelled: false,
          expired: hit._source?.expiration
            ? Date.parse(hit._source?.expiration) < Date.now()
            : false,
        };
      }

      acc[hit._source.action_id].nbAgents += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: CurrentAction })
  );
}
