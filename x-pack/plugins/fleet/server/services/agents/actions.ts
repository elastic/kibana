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

export async function bulkCreateAgentActions(
  soClient: SavedObjectsClientContract,
  newAgentActions: Array<Omit<AgentAction, 'id'>>
): Promise<AgentAction[]> {
  return bulkCreateActions(soClient, newAgentActions);
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
  const actionSO = await soClient.create<BaseAgentActionSOAttributes>(
    AGENT_ACTION_SAVED_OBJECT_TYPE,
    {
      ...newAgentAction,
      data: newAgentAction.data ? JSON.stringify(newAgentAction.data) : undefined,
      ack_data: newAgentAction.ack_data ? JSON.stringify(newAgentAction.ack_data) : undefined,
    }
  );

  if (isAgentActionSavedObject(actionSO)) {
    const agentAction = savedObjectToAgentAction(actionSO);
    // Action `data` is encrypted, so is not returned from the saved object
    // so we add back the original value from the request to form the expected
    // response shape for POST create agent action endpoint
    agentAction.data = newAgentAction.data;

    return agentAction;
  } else if (isPolicyActionSavedObject(actionSO)) {
    const agentAction = savedObjectToAgentAction(actionSO);
    agentAction.data = newAgentAction.data;

    return agentAction;
  }
  throw new Error('Invalid action');
}

async function bulkCreateActions(
  soClient: SavedObjectsClientContract,
  newAgentActions: Array<Omit<AgentPolicyAction, 'id'>>
): Promise<AgentPolicyAction[]>;
async function bulkCreateActions(
  soClient: SavedObjectsClientContract,
  newAgentActions: Array<Omit<AgentAction, 'id'>>
): Promise<AgentAction[]>;
async function bulkCreateActions(
  soClient: SavedObjectsClientContract,
  newAgentActions: Array<Omit<AgentPolicyAction, 'id'> | Omit<AgentAction, 'id'>>
): Promise<Array<AgentPolicyAction | AgentAction>> {
  const { saved_objects: actionSOs } = await soClient.bulkCreate<BaseAgentActionSOAttributes>(
    newAgentActions.map((newAgentAction) => ({
      type: AGENT_ACTION_SAVED_OBJECT_TYPE,
      attributes: {
        ...newAgentAction,
        data: newAgentAction.data ? JSON.stringify(newAgentAction.data) : undefined,
        ack_data: newAgentAction.ack_data ? JSON.stringify(newAgentAction.ack_data) : undefined,
      },
    }))
  );

  return actionSOs.map((actionSO) => {
    if (isAgentActionSavedObject(actionSO)) {
      const agentAction = savedObjectToAgentAction(actionSO);
      // Compared to single create (createAction()), we don't add back the
      // original value of `agentAction.data` as this method isn't exposed
      // via an HTTP endpoint
      return agentAction;
    } else if (isPolicyActionSavedObject(actionSO)) {
      const agentAction = savedObjectToAgentAction(actionSO);
      return agentAction;
    }
    throw new Error('Invalid action');
  });
}

export async function getAgentActionsForCheckin(
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentAction[]> {
  const filter = nodeTypes.function.buildNode('and', [
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNodeWithArgumentNodes('is', [
        nodeTypes.literal.buildNode(`${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at`),
        nodeTypes.wildcard.buildNode(nodeTypes.wildcard.wildcardSymbol),
        nodeTypes.literal.buildNode(false),
      ])
    ),
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNodeWithArgumentNodes('is', [
        nodeTypes.literal.buildNode(`${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.type`),
        nodeTypes.literal.buildNode('INTERNAL_POLICY_REASSIGN'),
        nodeTypes.literal.buildNode(false),
      ])
    ),
    nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(`${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.agent_id`),
      nodeTypes.literal.buildNode(agentId),
      nodeTypes.literal.buildNode(false),
    ]),
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

export async function getNewActionsSince(
  soClient: SavedObjectsClientContract,
  timestamp: string,
  decryptData: boolean = true
) {
  const filter = nodeTypes.function.buildNode('and', [
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNodeWithArgumentNodes('is', [
        nodeTypes.literal.buildNode(`${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.sent_at`),
        nodeTypes.wildcard.buildNode(nodeTypes.wildcard.wildcardSymbol),
        nodeTypes.literal.buildNode(false),
      ])
    ),
    nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(`${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.agent_id`),
      nodeTypes.wildcard.buildNode(nodeTypes.wildcard.wildcardSymbol),
      nodeTypes.literal.buildNode(false),
    ]),
    nodeTypes.function.buildNode(
      'range',
      `${AGENT_ACTION_SAVED_OBJECT_TYPE}.attributes.created_at`,
      {
        gt: timestamp,
      }
    ),
  ]);

  const actions = (
    await soClient.find<AgentActionSOAttributes>({
      type: AGENT_ACTION_SAVED_OBJECT_TYPE,
      filter,
    })
  ).saved_objects
    .filter(isAgentActionSavedObject)
    .map((so) => savedObjectToAgentAction(so));

  if (!decryptData) {
    return actions;
  }

  return await Promise.all(
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
