/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';

import type { FleetServerAgentAction, CurrentUpgrade } from '../../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { SO_SEARCH_LIMIT } from '../../constants';

/**
 * Return current bulk upgrades (non completed or cancelled)
 */
export async function getCurrentBulkUpgrades(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
): Promise<CurrentUpgrade[]> {
  // Fetch all non expired actions
  const [_upgradeActions, cancelledActionIds] = await Promise.all([
    _getUpgradeActions(esClient, now),
    _getCancelledActionId(esClient, now),
  ]);

  let upgradeActions = _upgradeActions.filter(
    (action) => cancelledActionIds.indexOf(action.actionId) < 0
  );

  // Fetch acknowledged result for every upgrade action
  upgradeActions = await pMap(
    upgradeActions,
    async (upgradeAction) => {
      const { count } = await esClient.count({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            must: [
              {
                term: {
                  action_id: upgradeAction.actionId,
                },
              },
            ],
          },
        },
      });

      return {
        ...upgradeAction,
        nbAgentsAck: count,
        complete: upgradeAction.nbAgents <= count,
      };
    },
    { concurrency: 20 }
  );

  upgradeActions = upgradeActions.filter((action) => !action.complete);

  return upgradeActions;
}

async function _getCancelledActionId(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
) {
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

async function _getUpgradeActions(esClient: ElasticsearchClient, now = new Date().toISOString()) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'UPGRADE',
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

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      if (!acc[hit._source.action_id]) {
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgents: 0,
          complete: false,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: hit._source?.start_time,
        };
      }

      acc[hit._source.action_id].nbAgents += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: CurrentUpgrade })
  );
}
