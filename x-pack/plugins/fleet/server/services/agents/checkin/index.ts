/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsBulkCreateObject,
} from 'src/core/server';
import {
  Agent,
  NewAgentEvent,
  AgentEvent,
  AgentSOAttributes,
  AgentEventSOAttributes,
} from '../../../types';

import { AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../../constants';
import { agentCheckinState } from './state';
import { getAgentActionsForCheckin } from '../actions';
import { updateAgent } from '../crud';

export async function agentCheckin(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agent: Agent,
  data: {
    events: NewAgentEvent[];
    localMetadata?: any;
    status?: 'online' | 'error' | 'degraded';
  },
  options?: { signal: AbortSignal }
) {
  const updateData: Partial<AgentSOAttributes> = {};
  await processEventsForCheckin(soClient, agent, data.events);
  if (data.localMetadata && !deepEqual(data.localMetadata, agent.local_metadata)) {
    updateData.local_metadata = data.localMetadata;
  }
  if (data.status !== agent.last_checkin_status) {
    updateData.last_checkin_status = data.status;
  }
  // Update agent only if something changed
  if (Object.keys(updateData).length > 0) {
    await updateAgent(soClient, esClient, agent.id, updateData);
  }
  // Check if some actions are not acknowledged
  let actions = await getAgentActionsForCheckin(soClient, agent.id);
  if (actions.length > 0) {
    return { actions };
  }

  // Wait for new actions
  actions = await agentCheckinState.subscribeToNewActions(soClient, esClient, agent, options);

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
    event.policy_id = agent.policy_id;

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
