/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
} from 'src/core/server';
import Boom from '@hapi/boom';
import LRU from 'lru-cache';
import {
  Agent,
  AgentAction,
  AgentPolicyAction,
  AgentPolicyActionV7_9,
  AgentEvent,
  AgentEventSOAttributes,
  AgentSOAttributes,
  AgentActionSOAttributes,
} from '../../types';
import {
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_ACTION_SAVED_OBJECT_TYPE,
} from '../../constants';
import { getAgentActionByIds } from './actions';
import { forceUnenrollAgent } from './unenroll';
import { ackAgentUpgraded } from './upgrade';

const ALLOWED_ACKNOWLEDGEMENT_TYPE: string[] = ['ACTION_RESULT'];

const actionCache = new LRU<string, AgentAction>({
  max: 20,
  maxAge: 10 * 60 * 1000, // 10 minutes
});

export async function acknowledgeAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  agentEvents: AgentEvent[]
): Promise<AgentAction[]> {
  if (agentEvents.length === 0) {
    return [];
  }

  for (const agentEvent of agentEvents) {
    if (!isAllowedType(agentEvent.type)) {
      throw Boom.badRequest(`${agentEvent.type} not allowed for acknowledgment only ACTION_RESULT`);
    }
  }

  const actionIds = agentEvents
    .map((event) => event.action_id)
    .filter((actionId) => actionId !== undefined) as string[];

  let actions: AgentAction[];
  try {
    actions = await fetchActionsUsingCache(soClient, actionIds);
  } catch (error) {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      throw Boom.badRequest(`One or more actions cannot be found`);
    }
    throw error;
  }

  const agentActionsIds: string[] = [];
  for (const action of actions) {
    if (action.agent_id) {
      agentActionsIds.push(action.id);
    }
    if (action.agent_id && action.agent_id !== agent.id) {
      throw Boom.badRequest(`${action.id} not found`);
    }
  }

  const isAgentUnenrolled = actions.some((action) => action.type === 'UNENROLL');
  if (isAgentUnenrolled) {
    await forceUnenrollAgent(soClient, agent.id);
  }

  const upgradeAction = actions.find((action) => action.type === 'UPGRADE');
  if (upgradeAction) {
    await ackAgentUpgraded(soClient, upgradeAction);
  }

  const configChangeAction = getLatestConfigChangePolicyActionIfUpdated(agent, actions);

  await soClient.bulkUpdate<AgentSOAttributes | AgentActionSOAttributes>([
    ...(configChangeAction
      ? [
          {
            type: AGENT_SAVED_OBJECT_TYPE,
            id: agent.id,
            attributes: {
              policy_revision: configChangeAction.policy_revision,
              packages: configChangeAction?.ack_data?.packages,
            },
          },
        ]
      : []),
    ...buildUpdateAgentActionSentAt(agentActionsIds),
  ]);

  return actions;
}

async function fetchActionsUsingCache(
  soClient: SavedObjectsClientContract,
  actionIds: string[]
): Promise<AgentAction[]> {
  const missingActionIds: string[] = [];
  const actions = actionIds
    .map((actionId) => {
      const action = actionCache.get(actionId);
      if (!action) {
        missingActionIds.push(actionId);
      }
      return action;
    })
    .filter((action): action is AgentAction => action !== undefined);

  if (missingActionIds.length === 0) {
    return actions;
  }

  const freshActions = await getAgentActionByIds(soClient, actionIds, false);
  freshActions.forEach((action) => actionCache.set(action.id, action));

  return [...freshActions, ...actions];
}

function isAgentPolicyAction(
  action: AgentAction | AgentPolicyAction | AgentPolicyActionV7_9
): action is AgentPolicyAction | AgentPolicyActionV7_9 {
  return (action as AgentPolicyAction).policy_id !== undefined;
}

function getLatestConfigChangePolicyActionIfUpdated(
  agent: Agent,
  actions: Array<AgentAction | AgentPolicyAction | AgentPolicyActionV7_9>
): AgentPolicyAction | AgentPolicyActionV7_9 | null {
  return actions.reduce<null | AgentPolicyAction | AgentPolicyActionV7_9>((acc, action) => {
    if (
      !isAgentPolicyAction(action) ||
      (action.type !== 'POLICY_CHANGE' && action.type !== 'CONFIG_CHANGE') ||
      action.policy_id !== agent.policy_id ||
      (action?.policy_revision ?? 0) < (agent.policy_revision || 0)
    ) {
      return acc;
    }

    return action;
  }, null);
}

function buildUpdateAgentActionSentAt(
  actionsIds: string[],
  sentAt: string = new Date().toISOString()
) {
  return actionsIds.map((actionId) => ({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    id: actionId,
    attributes: {
      sent_at: sentAt,
    },
  }));
}

function isAllowedType(eventType: string): boolean {
  return ALLOWED_ACKNOWLEDGEMENT_TYPE.indexOf(eventType) >= 0;
}

export async function saveAgentEvents(
  soClient: SavedObjectsClientContract,
  events: AgentEvent[]
): Promise<SavedObjectsBulkResponse<AgentEventSOAttributes>> {
  const objects: Array<SavedObjectsBulkCreateObject<AgentEventSOAttributes>> = events.map(
    (eventData) => {
      return {
        attributes: {
          ...eventData,
          payload: eventData.payload ? JSON.stringify(eventData.payload) : undefined,
        },
        type: AGENT_EVENT_SAVED_OBJECT_TYPE,
      };
    }
  );

  return await soClient.bulkCreate(objects);
}

export interface AcksService {
  acknowledgeAgentActions: (
    soClient: SavedObjectsClientContract,
    agent: Agent,
    actionIds: AgentEvent[]
  ) => Promise<AgentAction[]>;

  authenticateAgentWithAccessToken: (
    soClient: SavedObjectsClientContract,
    request: KibanaRequest
  ) => Promise<Agent>;

  getSavedObjectsClientContract: (kibanaRequest: KibanaRequest) => SavedObjectsClientContract;

  saveAgentEvents: (
    soClient: SavedObjectsClientContract,
    events: AgentEvent[]
  ) => Promise<SavedObjectsBulkResponse<AgentEventSOAttributes>>;
}
