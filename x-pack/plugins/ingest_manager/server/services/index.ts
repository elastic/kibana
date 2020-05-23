/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AgentStatus } from '../../common/types/models';
import * as settingsService from './settings';
export { ESIndexPatternSavedObjectService } from './es_index_pattern';

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
   * Return the status by the Agent's id
   * @param soClient
   * @param agentId
   */
  getAgentStatusById(soClient: SavedObjectsClientContract, agentId: string): Promise<AgentStatus>;
}

// Saved object services
export { datasourceService } from './datasource';
export { agentConfigService } from './agent_config';
export { outputService } from './output';
export { settingsService };

// Plugin services
export { appContextService } from './app_context';
export { licenseService } from './license';
