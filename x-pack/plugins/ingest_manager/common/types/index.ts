/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { AgentStatus } from './models';

export * from './models';
export * from './rest_spec';

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
 * Describes public IngestManager plugin contract returned at the `startup` stage.
 */
export interface IngestManagerStartupContract {
  esIndexPatternService: ESIndexPatternService;
  agentService: AgentService;
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

export interface IngestManagerConfigType {
  enabled: boolean;
  epm: {
    enabled: boolean;
    registryUrl: string;
  };
  fleet: {
    enabled: boolean;
    defaultOutputHost: string;
    kibana: {
      host?: string;
      ca_sha256?: string;
    };
    elasticsearch: {
      host?: string;
      ca_sha256?: string;
    };
  };
}

// Calling Object.entries(PackagesGroupedByStatus) gave `status: string`
// which causes a "string is not assignable to type InstallationStatus` error
// see https://github.com/Microsoft/TypeScript/issues/20322
// and https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-263132208
// and https://github.com/Microsoft/TypeScript/issues/21826#issuecomment-479851685
export const entries = Object.entries as <T>(o: T) => Array<[keyof T, T[keyof T]]>;
