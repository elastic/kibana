/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';
import {
  Agent,
  AgentAction,
  AgentSOAttributes,
  NewAgentAction,
} from '../../../common/types/models';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../common/constants';

export async function updateAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  newAgentAction: NewAgentAction
): Promise<AgentAction> {
  const agentAction = createAgentAction(new Date(), newAgentAction);
  agent.actions.push(agentAction);
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
    actions: agent.actions,
  });
  return agentAction;
}

export function createAgentAction(createdAt: Date, newAgentAction: NewAgentAction): AgentAction {
  const agentAction: object = {
    id: uuid.v4(),
    created_at: createdAt.toISOString(),
  };

  Object.assign(agentAction, ...keys(newAgentAction).map(key => ({ [key]: newAgentAction[key] })));

  return agentAction as AgentAction;
}

function keys<O extends object>(obj: O): Array<keyof O> {
  return Object.keys(obj) as Array<keyof O>;
}

export interface ActionsService {
  getAgentByAccessAPIKeyId: (
    soClient: SavedObjectsClientContract,
    accessAPIKeyId: string
  ) => Promise<Agent>;

  getSavedObjectsClientContract: (kibanaRequest: KibanaRequest) => SavedObjectsClientContract;

  updateAgentActions: (
    soClient: SavedObjectsClientContract,
    agent: Agent,
    newAgentAction: NewAgentAction
  ) => Promise<AgentAction>;
}
