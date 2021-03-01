/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { Agent } from '../../../types';
import { appContextService } from '../../app_context';
import { agentCheckinStateConnectedAgentsFactory } from './state_connected_agents';
import { agentCheckinStateNewActionsFactory } from './state_new_actions';
import { AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS } from '../../../constants';

function agentCheckinStateFactory() {
  const agentConnected = agentCheckinStateConnectedAgentsFactory();
  let newActions: ReturnType<typeof agentCheckinStateNewActionsFactory>;
  let interval: NodeJS.Timeout;

  function start() {
    newActions = agentCheckinStateNewActionsFactory();
    interval = setInterval(async () => {
      try {
        await agentConnected.updateLastCheckinAt();
      } catch (err) {
        appContextService.getLogger().error(err);
      }
    }, AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
    }
  }
  return {
    subscribeToNewActions: async (
      soClient: SavedObjectsClientContract,
      esClient: ElasticsearchClient,
      agent: Agent,
      options?: { signal: AbortSignal }
    ) => {
      if (!newActions) {
        throw new Error('Agent checkin state not initialized');
      }

      return agentConnected.wrapPromise(
        agent.id,
        newActions.subscribeToNewActions(soClient, esClient, agent, options)
      );
    },
    start,
    stop,
  };
}

export const agentCheckinState = agentCheckinStateFactory();
