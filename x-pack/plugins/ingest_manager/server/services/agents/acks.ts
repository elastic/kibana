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

const ALLOWED_ACKNOWLEDGEMENT_TYPE: string[] = ['ACTION_RESULT'];

export async function acknowledgeAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  agentEvents: AgentEvent[]
): Promise<AgentAction[]> {
  const now = new Date().toISOString();

  const actionIds = agentEvents
    .map(event => event.action_id)
    .filter(actionId => actionId !== undefined);
  const actions = await getAgentActionByIds(soClient, actionIds as string[]);
  for (const action of actions) {
    if (action.agent_id !== agent.id) {
      throw Boom.badRequest(`${action.id} cannot be allowed by this agent`);
    }
  }

  const agentActionMap: Map<string, AgentAction> = new Map(
    actions.map(agentAction => [agentAction.id, agentAction])
  );

  const matchedUpdatedActions: AgentAction[] = [];

  agentEvents.forEach(agentEvent => {
    if (!isAllowedType(agentEvent.type)) {
      throw Boom.badRequest(`${agentEvent.type} not allowed for acknowledgment only ACTION_RESULT`);
    }
    if (agentActionMap.has(agentEvent.action_id!)) {
      const action = agentActionMap.get(agentEvent.action_id!) as AgentAction;
      if (!action.sent_at) {
        action.sent_at = now;
      }
      matchedUpdatedActions.push(action);
    } else {
      throw Boom.badRequest('all actions should belong to current agent');
    }
  });

  if (matchedUpdatedActions.length > 0) {
    const configRevision = matchedUpdatedActions.reduce((acc, action) => {
      if (action.type !== 'CONFIG_CHANGE') {
        return acc;
      }
      const data = action.data || {};

      if (data?.config?.id !== agent.config_id) {
        return acc;
      }

      return data?.config?.revision > acc ? data?.config?.revision : acc;
    }, agent.config_revision || 0);

    await soClient.bulkUpdate<AgentSOAttributes | AgentActionSOAttributes>([
      {
        type: AGENT_SAVED_OBJECT_TYPE,
        id: agent.id,
        attributes: {
          config_revision: configRevision,
        },
      },
      ...matchedUpdatedActions.map(updatedAction => ({
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
        id: updatedAction.id,
        attributes: {
          sent_at: updatedAction.sent_at,
        },
      })),
    ]);
  }

  return matchedUpdatedActions;
}

function isAllowedType(eventType: string): boolean {
  return ALLOWED_ACKNOWLEDGEMENT_TYPE.indexOf(eventType) >= 0;
}

export async function saveAgentEvents(
  soClient: SavedObjectsClientContract,
  events: AgentEvent[]
): Promise<SavedObjectsBulkResponse<AgentEventSOAttributes>> {
  const objects: Array<SavedObjectsBulkCreateObject<AgentEventSOAttributes>> = events.map(
    eventData => {
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

  getAgentByAccessAPIKeyId: (
    soClient: SavedObjectsClientContract,
    accessAPIKeyId: string
  ) => Promise<Agent>;

  getSavedObjectsClientContract: (kibanaRequest: KibanaRequest) => SavedObjectsClientContract;

  saveAgentEvents: (
    soClient: SavedObjectsClientContract,
    events: AgentEvent[]
  ) => Promise<SavedObjectsBulkResponse<AgentEventSOAttributes>>;
}
