/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import uuid from 'uuid/v4';
import semverParse from 'semver/functions/parse';
import semverDiff from 'semver/functions/diff';
import semverLte from 'semver/functions/lte';

import type { SavedObjectsClientContract } from 'src/core/server';
import type { AgentType, Agent, AgentSOAttributes, FleetServerAgent } from '../../types';
import { savedObjectToAgent } from './saved_objects';
import { AGENT_SAVED_OBJECT_TYPE, AGENTS_INDEX } from '../../constants';
import { IngestManagerError } from '../../errors';
import * as APIKeyService from '../api_keys';
import { agentPolicyService } from '../../services';
import { appContextService } from '../app_context';

export async function enroll(
  soClient: SavedObjectsClientContract,
  type: AgentType,
  agentPolicyId: string,
  metadata?: { local: any; userProvided: any }
): Promise<Agent> {
  const agentVersion = metadata?.local?.elastic?.agent?.version;
  validateAgentVersion(agentVersion);

  const agentPolicy = await agentPolicyService.get(soClient, agentPolicyId, false);
  if (agentPolicy?.is_managed) {
    throw new IngestManagerError(`Cannot enroll in managed policy ${agentPolicyId}`);
  }

  if (appContextService.getConfig()?.agents?.fleetServerEnabled) {
    const esClient = appContextService.getInternalUserESClient();

    const agentId = uuid();
    const accessAPIKey = await APIKeyService.generateAccessApiKey(soClient, agentId);
    const fleetServerAgent: FleetServerAgent = {
      active: true,
      policy_id: agentPolicyId,
      type,
      enrolled_at: new Date().toISOString(),
      user_provided_metadata: metadata?.userProvided ?? {},
      local_metadata: metadata?.local ?? {},
      access_api_key_id: accessAPIKey.id,
    };
    await esClient.create({
      index: AGENTS_INDEX,
      body: fleetServerAgent,
      id: agentId,
      refresh: 'wait_for',
    });

    return {
      id: agentId,
      current_error_events: [],
      packages: [],
      ...fleetServerAgent,
      access_api_key: accessAPIKey.key,
    } as Agent;
  }

  const agentData: AgentSOAttributes = {
    active: true,
    policy_id: agentPolicyId,
    type,
    enrolled_at: new Date().toISOString(),
    user_provided_metadata: metadata?.userProvided ?? {},
    local_metadata: metadata?.local ?? {},
    current_error_events: undefined,
    access_api_key_id: undefined,
    last_checkin: undefined,
    default_api_key: undefined,
  };

  const agent = savedObjectToAgent(
    await soClient.create<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentData, {
      refresh: false,
    })
  );

  const accessAPIKey = await APIKeyService.generateAccessApiKey(soClient, agent.id);

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
    access_api_key_id: accessAPIKey.id,
  });

  return { ...agent, access_api_key: accessAPIKey.key };
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
