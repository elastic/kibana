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
} from '../../types';
import { AGENT_EVENT_SAVED_OBJECT_TYPE, AGENT_SAVED_OBJECT_TYPE } from '../../constants';

const ALLOWED_ACKNOWLEDGEMENT_TYPE: string[] = ['ACTION_RESULT'];

export async function acknowledgeAgentActions(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  agentEvents: AgentEvent[]
): Promise<AgentAction[]> {
  const now = new Date().toISOString();

  const agentActionMap: Map<string, AgentAction> = new Map(
    agent.actions.map(agentAction => [agentAction.id, agentAction])
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
      const data = action.data ? JSON.parse(action.data as string) : {};

      if (data?.config?.id !== agent.config_id) {
        return acc;
      }

      return data?.config?.revision > acc ? data?.config?.revision : acc;
    }, agent.config_revision || 0);

    await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
      actions: matchedUpdatedActions,
      config_revision: configRevision,
    });
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
