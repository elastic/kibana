/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'src/core/server';
import {
  Agent,
  NewAgentEvent,
  AgentEvent,
  AgentSOAttributes,
  AgentEventSOAttributes,
} from '../../../types';

import { AGENT_SAVED_OBJECT_TYPE, AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../../constants';
import { agentCheckinState } from './state';
import { getAgentActionsForCheckin } from '../actions';

export async function agentCheckin(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  data: {
    events: NewAgentEvent[];
    localMetadata?: any;
    status?: 'online' | 'error' | 'degraded';
  },
  options?: { signal: AbortSignal }
) {
  const updateData: Partial<AgentSOAttributes> = {};
  const { updatedErrorEvents } = await processEventsForCheckin(soClient, agent, data.events);
  if (updatedErrorEvents) {
    updateData.current_error_events = JSON.stringify(updatedErrorEvents);
  }
  if (data.localMetadata) {
    updateData.local_metadata = data.localMetadata;
  }

  if (data.status !== agent.last_checkin_status) {
    updateData.last_checkin_status = data.status;
  }
  if (Object.keys(updateData).length > 0) {
    await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, updateData);
  }

  // Check if some actions are not acknowledged
  let actions = await getAgentActionsForCheckin(soClient, agent.id);
  if (actions.length > 0) {
    return { actions };
  }

  // Wait for new actions
  actions = await agentCheckinState.subscribeToNewActions(soClient, agent, options);

  return { actions };
}

async function processEventsForCheckin(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  events: NewAgentEvent[]
) {
  const updatedErrorEvents: Array<AgentEvent | NewAgentEvent> = [...agent.current_error_events];
  for (const event of events) {
    // @ts-ignore
    event.config_id = agent.config_id;

    if (isErrorOrState(event)) {
      // Remove any global or specific to a stream event
      const existingEventIndex = updatedErrorEvents.findIndex(
        (e) => e.stream_id === event.stream_id
      );
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
    updatedErrorEvents,
  };
}

async function createEventsForAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  events: NewAgentEvent[]
) {
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

  return soClient.bulkCreate(objects);
}

function isErrorOrState(event: AgentEvent | NewAgentEvent) {
  return event.type === 'STATE' || event.type === 'ERROR';
}
