/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  Agent,
  AgentAction,
  AgentPolicyAction,
  BaseAgentActionSOAttributes,
  AgentActionSOAttributes,
  AgentPolicyActionSOAttributes,
} from '../../../common/types/models';
import { AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  isAgentActionSavedObject,
  isPolicyActionSavedObject,
  savedObjectToAgentAction,
} from './saved_objects';
import { appContextService } from '../app_context';
import { nodeTypes } from '../../../../../../src/plugins/data/common';

export async function createAgentAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentAction, 'id'>
): Promise<AgentAction> {
  return createAction(soClient, newAgentAction);
}

export function createAgentPolicyAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentPolicyAction, 'id'>
): Promise<AgentPolicyAction> {
  return createAction(soClient, newAgentAction);
}
async function createAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentPolicyAction, 'id'>
): Promise<AgentPolicyAction>;
async function createAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentAction, 'id'>
): Promise<AgentAction>;
async function createAction(
  soClient: SavedObjectsClientContract,
  newAgentAction: Omit<AgentPolicyAction, 'id'> | Omit<AgentAction, 'id'>
): Promise<AgentPolicyAction | AgentAction> {
  const so = await soClient.create<BaseAgentActionSOAttributes>(AGENT_ACTION_SAVED_OBJECT_TYPE, {
    ...newAgentAction,
    data: newAgentAction.data ? JSON.stringify(newAgentAction.data) : undefined,
    ack_data: newAgentAction.ack_data ? JSON.stringify(newAgentAction.ack_data) : undefined,
  });

  if (isAgentActionSavedObject(so)) {
    const agentAction = savedObjectToAgentAction(so);
    agentAction.data = newAgentAction.data;

    return agentAction;
  } else if (isPolicyActionSavedObject(so)) {
    const agentAction = savedObjectToAgentAction(so);
    agentAction.data = newAgentAction.data;

    return agentAction;
  }
  throw new Error('Invalid action');
}

export async function getAgentActionsForCheckin(
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentAction[]> {
  const filter = nodeTypes.function.buildNode('and', [
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNode(
        'is',
        `${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at`,
        '*'
      )
    ),
    nodeTypes.function.buildNode(
      'is',
      `${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.agent_id`,
      agentId
    ),
  ]);
  const res = await soClient.find<AgentActionSOAttributes>({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    filter,
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
  actionIds: string[],
  decryptData: boolean = true
) {
  const actions = (
    await soClient.bulkGet<AgentActionSOAttributes>(
      actionIds.map((actionId) => ({
        id: actionId,
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
      }))
    )
  ).saved_objects.map((action) => savedObjectToAgentAction(action));

  if (!decryptData) {
    return actions;
  }

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

export async function getAgentPolicyActionByIds(
  soClient: SavedObjectsClientContract,
  actionIds: string[],
  decryptData: boolean = true
) {
  const actions = (
    await soClient.bulkGet<AgentPolicyActionSOAttributes>(
      actionIds.map((actionId) => ({
        id: actionId,
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
      }))
    )
  ).saved_objects.map((action) => savedObjectToAgentAction(action));

  if (!decryptData) {
    return actions;
  }

  return Promise.all(
    actions.map(async (action) => {
      // Get decrypted actions
      return savedObjectToAgentAction(
        await appContextService
          .getEncryptedSavedObjects()
          .getDecryptedAsInternalUser<AgentPolicyActionSOAttributes>(
            AGENT_ACTION_SAVED_OBJECT_TYPE,
            action.id
          )
      );
    })
  );
}

export async function getNewActionsSince(soClient: SavedObjectsClientContract, timestamp: string) {
  const filter = nodeTypes.function.buildNode('and', [
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNode(
        'is',
        `${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at`,
        '*'
      )
    ),
    nodeTypes.function.buildNode(
      'range',
      `${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.created_at`,
      {
        gte: timestamp,
      }
    ),
  ]);
  const res = await soClient.find<AgentActionSOAttributes>({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    filter,
  });

  return res.saved_objects
    .filter(isAgentActionSavedObject)
    .map((so) => savedObjectToAgentAction(so));
}

export async function getLatestConfigChangeAction(
  soClient: SavedObjectsClientContract,
  policyId: string
) {
  const res = await soClient.find<AgentPolicyActionSOAttributes>({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    search: policyId,
    searchFields: ['policy_id'],
    sortField: 'created_at',
    sortOrder: 'DESC',
  });

  if (res.saved_objects[0]) {
    return savedObjectToAgentAction(res.saved_objects[0]);
  }
}

export interface ActionsService {
  getAgent: (soClient: SavedObjectsClientContract, agentId: string) => Promise<Agent>;

  createAgentAction: (
    soClient: SavedObjectsClientContract,
    newAgentAction: Omit<AgentAction, 'id'>
  ) => Promise<AgentAction>;
}
