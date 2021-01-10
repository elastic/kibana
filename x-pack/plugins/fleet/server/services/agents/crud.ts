/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';

import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import { escapeSearchQueryPhrase } from '../saved_object';
import { savedObjectToAgent } from './saved_objects';
import { appContextService } from '../../services';
import * as crudServiceSO from './crud_so';
import * as crudServiceFleetServer from './crud_fleet_server';

export async function listAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ListWithKuery & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
  page: number;
  perPage: number;
}> {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;

  return fleetServerEnabled
    ? crudServiceFleetServer.listAgents(esClient, options)
    : crudServiceSO.listAgents(soClient, options);
}

export async function listAllAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showInactive: boolean;
  }
): Promise<{
  agents: Agent[];
  total: number;
}> {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;

  return fleetServerEnabled
    ? crudServiceFleetServer.listAllAgents(esClient, options)
    : crudServiceSO.listAllAgents(soClient, options);
}

export async function countInactiveAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: Pick<ListWithKuery, 'kuery'>
): Promise<number> {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;

  return fleetServerEnabled
    ? crudServiceFleetServer.countInactiveAgents(esClient, options)
    : crudServiceSO.countInactiveAgents(soClient, options);
}

export async function getAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.getAgent(esClient, agentId)
    : crudServiceSO.getAgent(soClient, agentId);
}

export async function getAgents(soClient: SavedObjectsClientContract, agentIds: string[]) {
  const agentSOs = await soClient.bulkGet<AgentSOAttributes>(
    agentIds.map((agentId) => ({
      id: agentId,
      type: AGENT_SAVED_OBJECT_TYPE,
    }))
  );
  const agents = agentSOs.saved_objects.map(savedObjectToAgent);
  return agents;
}

export async function getAgentByAccessAPIKeyId(
  soClient: SavedObjectsClientContract,
  accessAPIKeyId: string
): Promise<Agent> {
  const response = await soClient.find<AgentSOAttributes>({
    type: AGENT_SAVED_OBJECT_TYPE,
    searchFields: ['access_api_key_id'],
    search: escapeSearchQueryPhrase(accessAPIKeyId),
  });
  const [agent] = response.saved_objects.map(savedObjectToAgent);

  if (!agent) {
    throw Boom.notFound('Agent not found');
  }
  if (agent.access_api_key_id !== accessAPIKeyId) {
    throw new Error('Agent api key id is not matching');
  }
  if (!agent.active) {
    throw Boom.forbidden('Agent inactive');
  }

  return agent;
}

export async function updateAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  data: {
    userProvidedMetatada: any;
  }
) {
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    user_provided_metadata: data.userProvidedMetatada,
  });
}

export async function deleteAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.deleteAgent(esClient, agentId)
    : crudServiceSO.deleteAgent(soClient, agentId);
}
