/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'kibana/server';
import uuid from 'uuid';
import {
  Agent,
  AgentEvent,
  AgentAction,
  AgentSOAttributes,
  AgentEventSOAttributes,
} from '../../types';

import { agentConfigService } from '../agent_config';
import * as APIKeysService from '../api_keys';
import { AGENT_SAVED_OBJECT_TYPE, AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../constants';

export async function agentCheckin(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  events: AgentEvent[],
  localMetadata?: any
) {
  const updateData: {
    last_checkin: string;
    default_api_key?: string;
    actions?: AgentAction[];
    local_metadata?: string;
    current_error_events?: string;
  } = {
    last_checkin: new Date().toISOString(),
  };

  const actions = filterActionsForCheckin(agent);

  // Generate new agent config if config is updated
  if (isNewAgentConfig(agent) && agent.policy_id) {
    const policy = await agentConfigService.getFullPolicy(soClient, agent.policy_id);
    if (policy) {
      // Assign output API keys
      // We currently only support default ouput
      if (!agent.default_api_key) {
        updateData.default_api_key = await APIKeysService.generateOutputApiKey('default', agent.id);
      }
      // Mutate the policy to set the api token for this agent
      policy.outputs.default.api_token = agent.default_api_key || updateData.default_api_key;

      const policyChangeAction: AgentAction = {
        id: uuid.v4(),
        type: 'POLICY_CHANGE',
        created_at: new Date().toISOString(),
        data: JSON.stringify({
          policy,
        }),
        sent_at: undefined,
      };
      actions.push(policyChangeAction);
      // persist new action
      updateData.actions = actions;
    }
  }
  if (localMetadata) {
    updateData.local_metadata = JSON.stringify(localMetadata);
  }

  const { updatedErrorEvents } = await processEventsForCheckin(soClient, agent, events);

  // Persist changes
  if (updatedErrorEvents) {
    updateData.current_error_events = JSON.stringify(updatedErrorEvents);
  }

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, updateData);

  return { actions };
}

async function processEventsForCheckin(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  events: AgentEvent[]
) {
  const acknowledgedActionIds: string[] = [];
  const updatedErrorEvents = [...agent.current_error_events];
  for (const event of events) {
    // @ts-ignore
    event.policy_id = agent.policy_id;

    if (isActionEvent(event)) {
      acknowledgedActionIds.push(event.action_id as string);
    }

    if (isErrorOrState(event)) {
      // Remove any global or specific to a stream event
      const existingEventIndex = updatedErrorEvents.findIndex(e => e.stream_id === event.stream_id);
      if (existingEventIndex >= 0) {
        updatedErrorEvents.splice(existingEventIndex, 1);
      }
      if (event.type === 'ERROR') {
        updatedErrorEvents.push(event);
      }
    }
  }

  if (events.length > 0) {
    await createEventsForAgent(soClient, agent.id, events);
  }

  return {
    acknowledgedActionIds,
    updatedErrorEvents,
  };
}

async function createEventsForAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  events: AgentEvent[]
) {
  const objects: Array<SavedObjectsBulkCreateObject<AgentEventSOAttributes>> = events.map(
    eventData => {
      return {
        attributes: {
          agent_id: agentId,
          ...eventData,
          payload: eventData.payload ? JSON.stringify(eventData.payload) : undefined,
        },
        type: AGENT_EVENT_SAVED_OBJECT_TYPE,
      };
    }
  );

  return soClient.bulkCreate(objects);
}

function isErrorOrState(event: AgentEvent) {
  return event.type === 'STATE' || event.type === 'ERROR';
}

function isActionEvent(event: AgentEvent) {
  return (
    event.type === 'ACTION' && (event.subtype === 'ACKNOWLEDGED' || event.subtype === 'UNKNOWN')
  );
}

function isNewAgentConfig(agent: Agent) {
  const isFirstCheckin = !agent.last_checkin;
  const isConfigUpdatedSinceLastCheckin =
    agent.last_checkin && agent.config_updated_at && agent.last_checkin <= agent.config_updated_at;

  return isFirstCheckin || isConfigUpdatedSinceLastCheckin;
}

function filterActionsForCheckin(agent: Agent): AgentAction[] {
  return agent.actions.filter((a: AgentAction) => !a.sent_at);
}
