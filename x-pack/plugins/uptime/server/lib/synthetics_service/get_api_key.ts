/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { SecurityPluginStart } from '../../../../security/server';
import {
  getSyntheticsServiceAPIKey,
  setSyntheticsServiceApiKey,
  syntheticsServiceApiKey,
} from '../saved_objects/service_api_key';
import {
  getElasticAgentMonitoringAPIKey,
  setElasticAgentMonitoringAPIKey,
  elasticAgentMonitoringApiKey,
} from '../saved_objects/elastic_agent_monitoring_api_key';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { UptimeServerSetup } from '../adapters';

export const getAPIKeyForSyntheticsService = async ({
  request,
  server,
}: {
  server: UptimeServerSetup;
  request?: KibanaRequest;
}): Promise<SyntheticsServiceApiKey | undefined> => {
  const { security, encryptedSavedObjects, authSavedObjectsClient } = server;

  const encryptedClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [syntheticsServiceApiKey.name],
  });

  try {
    const apiKey = await getSyntheticsServiceAPIKey(encryptedClient);
    if (apiKey) {
      return apiKey;
    }
  } catch (err) {
    // TODO: figure out how to handle decryption errors
  }

  return await generateAndSaveAPIKey({
    request,
    security,
    authSavedObjectsClient,
  });
};

export const generateAPIKeyForElasticAgentMonitoring = async ({
  request,
  server,
}: {
  server: UptimeServerSetup;
  request?: KibanaRequest;
}): Promise<SyntheticsServiceApiKey | undefined> => {
  const { security, encryptedSavedObjects, authSavedObjectsClient } = server;

  const encryptedClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [elasticAgentMonitoringApiKey.name],
  });

  try {
    const apiKey = await getElasticAgentMonitoringAPIKey(encryptedClient);
    if (apiKey) {
      return apiKey;
    }
  } catch (err) {
    // TODO: figure out how to handle decryption errors
  }

  return await generateAndSaveAPIKeyForElasticAgentMonitoring({
    request,
    security,
    authSavedObjectsClient,
  });
};

export const getAPIKeyForElasticAgentMonitoring = async ({
  request,
  server,
}: {
  server: UptimeServerSetup;
  request?: KibanaRequest;
}): Promise<SyntheticsServiceApiKey | undefined> => {
  const { encryptedSavedObjects } = server;

  const encryptedClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [elasticAgentMonitoringApiKey.name],
  });

  try {
    const apiKey = await getElasticAgentMonitoringAPIKey(encryptedClient);
    if (apiKey) {
      return apiKey;
    }
  } catch (err) {
    // TODO: figure out how to handle decryption errors
  }
};

export const generateAndSaveAPIKey = async ({
  security,
  request,
  authSavedObjectsClient,
}: {
  request?: KibanaRequest;
  security: SecurityPluginStart;
  // authSavedObject is needed for write operations
  authSavedObjectsClient?: SavedObjectsClientContract;
}) => {
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  if (!request) {
    throw new Error('User authorization is needed for api key generation');
  }

  // {
  //   "fleet_reader": {
  //           "cluster": ["monitor", "read_ilm", "read_pipeline"],
  //           "index": [
  //             {
  //               "names": [".fleet-*"],
  //               "privileges": ["read"]
  //             }
  //           ]
  //         }
  //   }

  const apiKeyResult = await security.authc.apiKeys?.create(request, {
    name: 'synthetics-api-key',
    role_descriptors: {
      synthetics_writer: {
        cluster: ['monitor', 'read_ilm', 'read_pipeline'],
        index: [
          {
            names: ['synthetics-*'],
            privileges: ['view_index_metadata', 'create_doc', 'auto_configure'],
          },
        ],
      },
    },
    metadata: {
      description:
        'Created for synthetics service to be passed to the heartbeat to communicate with ES',
    },
  });

  if (apiKeyResult) {
    const { id, name, api_key: apiKey } = apiKeyResult;
    const apiKeyObject = { id, name, apiKey };
    if (authSavedObjectsClient) {
      // discard decoded key and rest of the keys
      await setSyntheticsServiceApiKey(authSavedObjectsClient, apiKeyObject);
    }
    return apiKeyObject;
  }
};

export const generateAndSaveAPIKeyForElasticAgentMonitoring = async ({
  security,
  request,
  authSavedObjectsClient,
}: {
  request?: KibanaRequest;
  security: SecurityPluginStart;
  // authSavedObject is needed for write operations
  authSavedObjectsClient?: SavedObjectsClientContract;
}) => {
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  if (!request) {
    throw new Error('User authorization is needed for api key generation');
  }

  const apiKeyResult = await security.authc.apiKeys?.create(request, {
    name: 'synthetics-elastic-agent-monitoring-api-key',
    metadata: {
      description: 'Created for synthetics service to monitor Elastic Agent',
    },
    role_descriptors: {},
  });

  if (apiKeyResult) {
    const { id, name, api_key: apiKey } = apiKeyResult;
    const apiKeyObject = { id, name, apiKey };
    if (authSavedObjectsClient) {
      // discard decoded key and rest of the keys
      await setElasticAgentMonitoringAPIKey(authSavedObjectsClient, apiKeyObject);
    }
    return apiKeyObject;
  }
};
