/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { Agent } from '../../../types';
import { appContextService } from '../../app_context';
import { agentCheckinStateConnectedAgentsFactory } from './state_connected_agents';
import { agentCheckinStateNewActionsFactory } from './state_new_actions';
import { AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS } from '../../../constants';

function agentCheckinStateFactory() {
  const agentConnected = agentCheckinStateConnectedAgentsFactory();
  const newActions = agentCheckinStateNewActionsFactory();
  let interval: NodeJS.Timeout;
  function start() {
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
    subscribeToNewActions: (
      soClient: SavedObjectsClientContract,
      agent: Agent,
      options?: { signal: AbortSignal }
    ) =>
      agentConnected.wrapPromise(
        agent.id,
        newActions.subscribeToNewActions(soClient, agent, options)
      ),
    start,
    stop,
  };
}

export const agentCheckinState = agentCheckinStateFactory();
