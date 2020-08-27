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
import Boom from 'boom';
import {
  Agent,
  AgentAction,
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

const ALLOWED_ACKNOWLEDGEMENT_TYPE: string[] = ['ACTION_RESULT'];

export async function acknowledgeAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  agentEvents: AgentEvent[]
): Promise<AgentAction[]> {
  for (const agentEvent of agentEvents) {
    if (!isAllowedType(agentEvent.type)) {
      throw Boom.badRequest(`${agentEvent.type} not allowed for acknowledgment only ACTION_RESULT`);
    }
  }

  const actionIds = agentEvents
    .map((event) => event.action_id)
    .filter((actionId) => actionId !== undefined) as string[];

  let actions;
  try {
    actions = await getAgentActionByIds(soClient, actionIds, false);
  } catch (error) {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      throw Boom.badRequest(`One or more actions cannot be found`);
    }
    throw error;
  }

  const agentActionsIds = [];
  for (const action of actions) {
    if (action.agent_id) {
      agentActionsIds.push(action);
    }
    if (action.agent_id && action.agent_id !== agent.id) {
      throw Boom.badRequest(`${action.id} not found`);
    }
  }

  if (actions.length === 0) {
    return [];
  }

  const isAgentUnenrolled = actions.some((action) => action.type === 'UNENROLL');
  if (isAgentUnenrolled) {
    await forceUnenrollAgent(soClient, agent.id);
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
    ...buildUpdateAgentActionSentAt(actionIds),
  ]);

  return actions;
}

function getLatestConfigChangePolicyActionIfUpdated(agent: Agent, actions: AgentAction[]) {
  return actions.reduce<null | AgentAction>((acc, action) => {
    if (action.type !== 'CONFIG_CHANGE') {
      return acc;
    }
    if (action.policy_id !== agent.policy_id) {
      return acc;
    }

    if (!acc) {
      return action;
    }

    if (action.policy_revision && action.policy_revision > (acc.policy_revision || 0)) {
      return action;
    }

    return acc;
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
