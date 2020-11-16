/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import semverParse from 'semver/functions/parse';
import semverDiff from 'semver/functions/diff';
import semverLte from 'semver/functions/lte';

import { SavedObjectsClientContract } from 'src/core/server';
import { AgentType, Agent, AgentSOAttributes } from '../../types';
import { savedObjectToAgent } from './saved_objects';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import * as APIKeyService from '../api_keys';
import { appContextService } from '../app_context';

export async function enroll(
  soClient: SavedObjectsClientContract,
  type: AgentType,
  agentPolicyId: string,
  metadata?: { local: any; userProvided: any },
  sharedId?: string
): Promise<Agent> {
  const agentVersion = metadata?.local?.elastic?.agent?.version;
  validateAgentVersion(agentVersion);

  const existingAgent = sharedId ? await getAgentBySharedId(soClient, sharedId) : null;

  if (existingAgent && existingAgent.active === true) {
    throw Boom.badRequest('Impossible to enroll an already active agent');
  }

  const enrolledAt = new Date().toISOString();

  const agentData: AgentSOAttributes = {
    shared_id: sharedId,
    active: true,
    policy_id: agentPolicyId,
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

  const accessAPIKey = await APIKeyService.generateAccessApiKey(soClient, agent.id);

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

export function validateAgentVersion(
  agentVersion: string,
  kibanaVersion = appContextService.getKibanaVersion()
) {
  const agentVersionParsed = semverParse(agentVersion);
  if (!agentVersionParsed) {
    throw Boom.badRequest('Agent version not provided');
  }

  const kibanaVersionParsed = semverParse(kibanaVersion);
  if (!kibanaVersionParsed) {
    throw Boom.badRequest('Kibana version is not set or provided');
  }

  const diff = semverDiff(agentVersion, kibanaVersion);
  switch (diff) {
    // section 1) very close versions, only patch release differences - all combos should work
    // Agent a.b.1 < Kibana a.b.2
    // Agent a.b.2 > Kibana a.b.1
    case null:
    case 'prerelease':
    case 'prepatch':
    case 'patch':
      return; // OK

    // section 2) somewhat close versions, Agent minor release is 1 or 2 versions back and is older than the stack:
    // Agent a.9.x < Kibana a.10.x
    // Agent a.9.x < Kibana a.11.x
    case 'preminor':
    case 'minor':
      if (
        agentVersionParsed.minor < kibanaVersionParsed.minor &&
        kibanaVersionParsed.minor - agentVersionParsed.minor <= 2
      )
        return;

    // section 3) versions where Agent is a minor version or major version greater (newer) than the stack should not work:
    // Agent 7.10.x > Kibana 7.9.x
    // Agent 8.0.x > Kibana 7.9.x
    default:
      if (semverLte(agentVersionParsed, kibanaVersionParsed)) return;
      else
        throw Boom.badRequest(
          `Agent version ${agentVersion} is not compatible with Kibana version ${kibanaVersion}`
        );
  }
}
