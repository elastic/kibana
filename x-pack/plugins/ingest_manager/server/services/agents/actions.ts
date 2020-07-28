/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { Agent, AgentAction, AgentActionSOAttributes } from '../../../common/types/models';
import { AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { savedObjectToAgentAction } from './saved_objects';
import { appContextService } from '../app_context';

export async function createAgentAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentAction, 'id'>
): Promise<AgentAction> {
  const so = await soClient.create<AgentActionSOAttributes>(AGENT_ACTION_SAVED_OBJECT_TYPE, {
    ...newAgentAction,
    data: newAgentAction.data ? JSON.stringify(newAgentAction.data) : undefined,
  });

  const agentAction = savedObjectToAgentAction(so);
  agentAction.data = newAgentAction.data;

  return agentAction;
}

export async function getAgentActionsForCheckin(
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentAction[]> {
  const res = await soClient.find<AgentActionSOAttributes>({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    filter: `not ${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at: * and ${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.agent_id:${agentId}`,
  });

  return Promise.all(
    res.saved_objects.map(async (so) => {
      // Get decrypted actions
      return savedObjectToAgentAction(
        await appContextService
          .getEncryptedSavedObjects()
          .getDecryptedAsInternalUser<AgentActionSOAttributes>(
            AGENT_ACTION_SAVED_OBJECT_TYPE,
            so.id
          )
      );
    })
  );
}

export async function getAgentActionByIds(
  soClient: SavedObjectsClientContract,
  actionIds: string[]
) {
  const actions = (
    await soClient.bulkGet<AgentActionSOAttributes>(
      actionIds.map((actionId) => ({
        id: actionId,
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
      }))
    )
  ).saved_objects.map(savedObjectToAgentAction);

  return Promise.all(
    actions.map(async (action) => {
      // Get decrypted actions
      return savedObjectToAgentAction(
        await appContextService
          .getEncryptedSavedObjects()
          .getDecryptedAsInternalUser<AgentActionSOAttributes>(
            AGENT_ACTION_SAVED_OBJECT_TYPE,
            action.id
          )
      );
    })
  );
}

export async function getNewActionsSince(soClient: SavedObjectsClientContract, timestamp: string) {
  const res = await soClient.find<AgentActionSOAttributes>({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    filter: `not ${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at: * AND ${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.created_at >= "${timestamp}"`,
  });

  return res.saved_objects.map(savedObjectToAgentAction);
}

export interface ActionsService {
  getAgent: (soClient: SavedObjectsClientContract, agentId: string) => Promise<Agent>;

  createAgentAction: (
    soClient: SavedObjectsClientContract,
    newAgentAction: AgentActionSOAttributes
  ) => Promise<AgentAction>;
}
