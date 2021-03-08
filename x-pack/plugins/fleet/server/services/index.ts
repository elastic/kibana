/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';

import type { AgentStatus, Agent, EsAssetReference } from '../types';

import { getAgent, listAgents } from './agents';
import { agentPolicyService } from './agent_policy';
import * as settingsService from './settings';

export { ESIndexPatternSavedObjectService } from './es_index_pattern';
export { getRegistryUrl } from './epm/registry/registry_url';

/**
 * Service to return the index pattern of EPM packages
 */
export interface ESIndexPatternService {
  getESIndexPattern(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string
  ): Promise<string | undefined>;
}

/**
 * Service that provides exported function that return information about EPM packages
 */

export interface PackageService {
  getInstalledEsAssetReferences(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string
  ): Promise<EsAssetReference[]>;
}

/**
 * A service that provides exported functions that return information about an Agent
 */
export interface AgentService {
  /**
   * Get an Agent by id
   */
  getAgent: typeof getAgent;
  /**
   * Authenticate an agent with access toekn
   */
  authenticateAgentWithAccessToken(
    esClient: ElasticsearchClient,
    request: KibanaRequest
  ): Promise<Agent>;
  /**
   * Return the status by the Agent's id
   */
  getAgentStatusById(esClient: ElasticsearchClient, agentId: string): Promise<AgentStatus>;
  /**
   * List agents
   */
  listAgents: typeof listAgents;
}

export interface AgentPolicyServiceInterface {
  get: typeof agentPolicyService['get'];
  list: typeof agentPolicyService['list'];
  getDefaultAgentPolicyId: typeof agentPolicyService['getDefaultAgentPolicyId'];
  getFullAgentPolicy: typeof agentPolicyService['getFullAgentPolicy'];
}

// Saved object services
export { agentPolicyService } from './agent_policy';
export { packagePolicyService } from './package_policy';
export { outputService } from './output';
export { settingsService };

// Plugin services
export { appContextService } from './app_context';
export { licenseService } from './license';
