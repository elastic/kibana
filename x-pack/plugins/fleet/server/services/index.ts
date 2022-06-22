/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { agentPolicyService } from './agent_policy';
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

export interface AgentPolicyServiceInterface {
  get: typeof agentPolicyService['get'];
  list: typeof agentPolicyService['list'];
  getFullAgentPolicy: typeof agentPolicyService['getFullAgentPolicy'];
  getByIds: typeof agentPolicyService['getByIDs'];
}

// Agent services
export { AgentServiceImpl } from './agents';
export type { AgentClient, AgentService } from './agents';

// Saved object services
export { agentPolicyService } from './agent_policy';
export { packagePolicyService } from './package_policy';
export { outputService } from './output';
export { settingsService };

// Plugin services
export { appContextService } from './app_context';
export { licenseService } from './license';

// Artifacts services
export * from './artifacts';

// Policy preconfiguration functions
export { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';

// Package Services
export { PackageServiceImpl } from './epm';
export type { PackageService, PackageClient } from './epm';
