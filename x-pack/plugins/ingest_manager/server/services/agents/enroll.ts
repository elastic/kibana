/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import semver from 'semver';
import { SavedObjectsClientContract } from 'src/core/server';
import { AgentType, Agent, AgentSOAttributes } from '../../types';
import { savedObjectToAgent } from './saved_objects';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import * as APIKeyService from '../api_keys';
import { appContextService } from '../app_context';

export async function enroll(
  soClient: SavedObjectsClientContract,
  type: AgentType,
  configId: string,
  metadata?: { local: any; userProvided: any },
  sharedId?: string
): Promise<Agent> {
  validateAgentVersion(metadata);

  const existingAgent = sharedId ? await getAgentBySharedId(soClient, sharedId) : null;

  if (existingAgent && existingAgent.active === true) {
    throw Boom.badRequest('Impossible to enroll an already active agent');
  }

  const enrolledAt = new Date().toISOString();

  const agentData: AgentSOAttributes = {
    shared_id: sharedId,
    active: true,
    config_id: configId,
    type,
    enrolled_at: enrolledAt,
    user_provided_metadata: metadata?.userProvided ?? {},
    local_metadata: metadata?.local ?? {},
    current_error_events: undefined,
    access_api_key_id: undefined,
    last_checkin: undefined,
    default_api_key: undefined,
  };

  let agent;
  if (existingAgent) {
    await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, existingAgent.id, agentData, {
      refresh: false,
    });
    agent = {
      ...existingAgent,
      ...agentData,
      user_provided_metadata: metadata?.userProvided ?? {},
      local_metadata: metadata?.local ?? {},
      current_error_events: [],
    } as Agent;
  } else {
    agent = savedObjectToAgent(
      await soClient.create<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentData, {
        refresh: false,
      })
    );
  }

  const accessAPIKey = await APIKeyService.generateAccessApiKey(soClient, agent.id, configId);

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
    access_api_key_id: accessAPIKey.id,
  });

  return { ...agent, access_api_key: accessAPIKey.key };
}

async function getAgentBySharedId(soClient: SavedObjectsClientContract, sharedId: string) {
  const response = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    searchFields: ['shared_id'],
    search: sharedId,
  });

  const agents = response.saved_objects.map(savedObjectToAgent);

  if (agents.length > 0) {
    return agents[0];
  }

  return null;
}

export function validateAgentVersion(metadata?: { local: any; userProvided: any }) {
  const kibanaVersion = semver.parse(appContextService.getKibanaVersion());
  if (!kibanaVersion) {
    throw Boom.badRequest('Kibana version is not set');
  }
  const version = semver.parse(metadata?.local?.elastic?.agent?.version);
  if (!version) {
    throw Boom.badRequest('Agent version not provided in metadata.');
  }

  if (!version || !semver.lte(formatVersion(version), formatVersion(kibanaVersion))) {
    throw Boom.badRequest('Agent version is not compatible with kibana version');
  }
}

/**
 * used to remove prelease from version as includePrerelease in not working as expected
 */
function formatVersion(version: semver.SemVer) {
  return `${version.major}.${version.minor}.${version.patch}`;
}
