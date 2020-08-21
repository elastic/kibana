/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, KibanaRequest } from 'kibana/server';
import { AgentStatus, Agent } from '../types';
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
 * A service that provides exported functions that return information about an Agent
 */
export interface AgentService {
  /**
   * Get an Agent by id
   */
  getAgent(soClient: SavedObjectsClientContract, agentId: string): Promise<Agent>;
  /**
   * Authenticate an agent with access toekn
   */
  authenticateAgentWithAccessToken(
    soClient: SavedObjectsClientContract,
    request: KibanaRequest
  ): Promise<Agent>;
  /**
   * Return the status by the Agent's id
   */
  getAgentStatusById(soClient: SavedObjectsClientContract, agentId: string): Promise<AgentStatus>;
  /**
   * List agents
   */
  listAgents(
    soClient: SavedObjectsClientContract,
    options: {
      page: number;
      perPage: number;
      kuery?: string;
      showInactive: boolean;
    }
  ): Promise<{
    agents: Agent[];
    total: number;
    page: number;
    perPage: number;
  }>;
}

// Saved object services
export { agentPolicyService } from './agent_policy';
export { packagePolicyService } from './package_policy';
export { outputService } from './output';
export { settingsService };

// Plugin services
export { appContextService } from './app_context';
export { licenseService } from './license';
