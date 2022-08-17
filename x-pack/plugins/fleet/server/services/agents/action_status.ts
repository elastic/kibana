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
export async function getActionStatuses(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
): Promise<CurrentAction[]> {
  // Fetch all non expired actions
  const [_actions, cancelledActionIds] = await Promise.all([
    _getActions(esClient, now),
    _getCancelledActionId(esClient, now),
  ]);

  let actions = _actions.filter((action) => cancelledActionIds.indexOf(action.actionId) < 0);

  // Fetch acknowledged result for every upgrade action
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

      const nbAgents = action.total ?? action.nbAgents;

      return {
        ...action,
        nbAgents,
        nbAgentsAck: count,
        complete: nbAgents <= count,
      };
    },
    { concurrency: 20 }
  );

  return actions;
}

async function _getCancelledActionId(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
) {
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
          {
            range: {
              expiration: { gte: now },
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => hit._source?.data?.target_id as string);
}

async function _getActions(esClient: ElasticsearchClient, now = new Date().toISOString()) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            exists: {
              field: 'agents',
            },
          },
          {
            range: {
              expiration: { gte: now },
            },
          },
          {
            range: {
              '@timestamp': { gte: 'now-1h' },
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
          total: hit._source?.total,
          timedOut,
        };
      }

      acc[hit._source.action_id].nbAgents += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: CurrentAction })
  );
}
