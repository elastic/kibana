/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';
import { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import { appContextService, agentPolicyService } from '../../services';
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

export async function getAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentIds: string[]
) {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.getAgents(esClient, agentIds)
    : crudServiceSO.getAgents(soClient, agentIds);
}

export async function getAgentPolicyForAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await getAgent(soClient, esClient, agentId);
  if (!agent.policy_id) {
    return;
  }

  const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
  if (agentPolicy) {
    return agentPolicy;
  }
}

export async function getAgentByAccessAPIKeyId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  accessAPIKeyId: string
): Promise<Agent> {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.getAgentByAccessAPIKeyId(esClient, accessAPIKeyId)
    : crudServiceSO.getAgentByAccessAPIKeyId(soClient, accessAPIKeyId);
}

export async function updateAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  data: Partial<AgentSOAttributes>
) {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.updateAgent(esClient, agentId, data)
    : crudServiceSO.updateAgent(soClient, agentId, data);
}

export async function bulkUpdateAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  data: Array<{
    agentId: string;
    data: Partial<AgentSOAttributes>;
  }>
) {
  const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
  return fleetServerEnabled
    ? crudServiceFleetServer.bulkUpdateAgents(esClient, data)
    : crudServiceSO.bulkUpdateAgents(soClient, data);
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
