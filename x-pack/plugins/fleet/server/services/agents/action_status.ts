/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';

import { SO_SEARCH_LIMIT } from '../../constants';

import { AGENT_ACTIONS_STATUS_INDEX } from '../../../common/constants';

import type { FleetServerAgentAction, CurrentAction } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

/**
 * Return current bulk actions
 */
export async function getActionStatuses(esClient: ElasticsearchClient): Promise<CurrentAction[]> {
  let actions = await _getActions(esClient);
  const cancelledActionIds = await _getCancelledActionId(esClient);
  const actionStatuses = await _getActionStatuses(esClient);

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
      const isCancelled = cancelledActionIds.indexOf(action.actionId) > -1;

      const actionStatus = actionStatuses.find((as) => as.actionId === action.actionId);

      return {
        ...action,
        nbAgentsAck: count,
        status: complete
          ? 'complete'
          : isCancelled
          ? 'cancelled'
          : actionStatus?.status === 'failed'
          ? 'failed'
          : action.status,
        errorMessage: actionStatus?.errorMessage,
        total,
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

async function _getActionStatuses(esClient: ElasticsearchClient) {
  const res = await esClient.search<any>({
    index: AGENT_ACTIONS_STATUS_INDEX,
    ignore_unavailable: true,
  });

  return res.hits.hits.map((hit) => ({
    actionId: hit._source?.data.action_id,
    status: hit._source?.data.status,
    errorMessage: hit._source?.data.error_message,
  }));
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
          nbAgents: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime,
          type: hit._source?.type,
          total: hit._source?.total ?? 0,
          status: isExpired ? 'expired' : 'in progress',
        };
      }

      acc[hit._source.action_id].nbAgents += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: CurrentAction })
  );
}
