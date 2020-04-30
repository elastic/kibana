/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'src/core/server';
import {
  Agent,
  AgentEvent,
  AgentAction,
  AgentSOAttributes,
  AgentEventSOAttributes,
  AgentMetadata,
} from '../../types';

import { agentConfigService } from '../agent_config';
import * as APIKeysService from '../api_keys';
import { AGENT_SAVED_OBJECT_TYPE, AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../constants';
import { getAgentActionsForCheckin, createAgentAction } from './actions';
import { appContextService } from '../app_context';

export async function agentCheckin(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  events: AgentEvent[],
  localMetadata?: any
) {
  const updateData: {
    last_checkin: string;
    default_api_key?: string;
    local_metadata?: AgentMetadata;
    current_error_events?: string;
  } = {
    last_checkin: new Date().toISOString(),
  };

  const actions = await getAgentActionsForCheckin(soClient, agent.id);

  // Generate new agent config if config is updated
  if (agent.config_id && shouldCreateConfigAction(agent, actions)) {
    const {
      attributes: { default_api_key: defaultApiKey },
    } = await appContextService
      .getEncryptedSavedObjects()
      .getDecryptedAsInternalUser<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id);

    const config = await agentConfigService.getFullConfig(soClient, agent.config_id);
    if (config) {
      // Assign output API keys
      // We currently only support default ouput
      if (!defaultApiKey) {
        updateData.default_api_key = await APIKeysService.generateOutputApiKey(
          soClient,
          'default',
          agent.id
        );
      }
      // Mutate the config to set the api token for this agent
      config.outputs.default.api_key = defaultApiKey || updateData.default_api_key;

      const configChangeAction = await createAgentAction(soClient, {
        agent_id: agent.id,
        type: 'CONFIG_CHANGE',
        data: { config } as any,
        created_at: new Date().toISOString(),
        sent_at: undefined,
      });
      actions.push(configChangeAction);
    }
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
    event.config_id = agent.config_id;

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

export function shouldCreateConfigAction(agent: Agent, actions: AgentAction[]): boolean {
  if (!agent.config_id) {
    return false;
  }

  const isFirstCheckin = !agent.last_checkin;
  if (isFirstCheckin) {
    return true;
  }

  const isAgentConfigOutdated =
    // Config reassignment
    (!agent.config_revision && agent.config_newest_revision) ||
    // new revision of a config
    (agent.config_revision &&
      agent.config_newest_revision &&
      agent.config_revision < agent.config_newest_revision);

  if (!isAgentConfigOutdated) {
    return false;
  }

  const isActionAlreadyGenerated = !!actions.find(action => {
    if (!action.data || action.type !== 'CONFIG_CHANGE') {
      return false;
    }

    const { data } = action;

    return (
      data.config.id === agent.config_id && data.config.revision === agent.config_newest_revision
    );
  });

  return !isActionAlreadyGenerated;
}
