/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { Agent, AgentSOAttributes } from '../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';

export async function acknowledgeAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  actionIds: string[]
) {
  const now = new Date().toISOString();

  const updatedActions = agent.actions.map(action => {
    if (action.sent_at) {
      return action;
    }
    return { ...action, sent_at: actionIds.indexOf(action.id) >= 0 ? now : undefined };
  });

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
    actions: updatedActions,
  });
}
