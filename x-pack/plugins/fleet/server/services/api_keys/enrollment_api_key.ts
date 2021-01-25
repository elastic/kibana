/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';
import { EnrollmentAPIKey } from '../../types';
import { appContextService } from '../app_context';
import * as enrollmentApiKeyServiceSO from './enrollment_api_key_so';
import * as enrollmentApiKeyServiceFleetServer from './enrollment_api_key_fleet_server';

export async function listEnrollmentApiKeys(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    showInactive?: boolean;
  }
): Promise<{ items: EnrollmentAPIKey[]; total: any; page: any; perPage: any }> {
  if (appContextService.getConfig()?.agents?.fleetServerEnabled === true) {
    return enrollmentApiKeyServiceFleetServer.listEnrollmentApiKeys(esClient, options);
  } else {
    return enrollmentApiKeyServiceSO.listEnrollmentApiKeys(soClient, options);
  }
}

export async function getEnrollmentAPIKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string
) {
  if (appContextService.getConfig()?.agents?.fleetServerEnabled === true) {
    return enrollmentApiKeyServiceFleetServer.getEnrollmentAPIKey(esClient, id);
  } else {
    return enrollmentApiKeyServiceSO.getEnrollmentAPIKey(soClient, id);
  }
}

/**
 * Invalidate an api key and mark it as inactive
 * @param soClient
 * @param id
 */
export async function deleteEnrollmentApiKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string
) {
  if (appContextService.getConfig()?.agents?.fleetServerEnabled === true) {
    return enrollmentApiKeyServiceFleetServer.deleteEnrollmentApiKey(soClient, esClient, id);
  } else {
    return enrollmentApiKeyServiceSO.deleteEnrollmentApiKey(soClient, id);
  }
}

export async function deleteEnrollmentApiKeyForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  agentPolicyId: string
) {
  return enrollmentApiKeyServiceSO.deleteEnrollmentApiKeyForAgentPolicyId(soClient, agentPolicyId);
}

export async function generateEnrollmentAPIKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  data: {
    name?: string;
    expiration?: string;
    agentPolicyId?: string;
  }
) {
  if (appContextService.getConfig()?.agents?.fleetServerEnabled === true) {
    return enrollmentApiKeyServiceFleetServer.generateEnrollmentAPIKey(soClient, esClient, data);
  } else {
    return enrollmentApiKeyServiceSO.generateEnrollmentAPIKey(soClient, data);
  }
}
