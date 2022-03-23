/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SecurityClusterPrivilege,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../src/core/server';

import { SecurityPluginStart } from '../../../../security/server';
import {
  getSyntheticsServiceAPIKey,
  deleteSyntheticsServiceApiKey,
  setSyntheticsServiceApiKey,
  syntheticsServiceApiKey,
} from '../saved_objects/service_api_key';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { UptimeServerSetup } from '../adapters';

export const serviceApiKeyPrivileges = {
  cluster: ['monitor', 'read_ilm', 'read_pipeline'] as SecurityClusterPrivilege[],
  index: [
    {
      names: ['synthetics-*'],
      privileges: [
        'view_index_metadata',
        'create_doc',
        'auto_configure',
      ] as SecurityIndexPrivilege[],
    },
  ],
};

export const getAPIKeyForSyntheticsService = async ({
  server,
}: {
  server: UptimeServerSetup;
}): Promise<SyntheticsServiceApiKey | undefined> => {
  const { encryptedSavedObjects } = server;

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
};

export const generateAndSaveServiceAPIKey = async ({
  server,
  security,
  request,
  authSavedObjectsClient,
}: {
  server: UptimeServerSetup;
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

  const { canEnable } = await getSyntheticsEnablement({ request, server });
  if (!canEnable) {
    throw new SyntheticsForbiddenError();
  }

  const apiKeyResult = await security.authc.apiKeys?.create(request, {
    name: 'synthetics-api-key',
    role_descriptors: {
      synthetics_writer: serviceApiKeyPrivileges,
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

export const deleteServiceApiKey = async ({
  request,
  server,
  savedObjectsClient,
}: {
  server: UptimeServerSetup;
  request?: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const { canEnable } = await getSyntheticsEnablement({ request, server });
  if (!canEnable) {
    throw new SyntheticsForbiddenError();
  }

  await deleteSyntheticsServiceApiKey(savedObjectsClient);
};

export const getSyntheticsEnablement = async ({
  request,
  server: { uptimeEsClient, security, encryptedSavedObjects },
}: {
  server: UptimeServerSetup;
  request?: KibanaRequest;
}) => {
  const encryptedClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [syntheticsServiceApiKey.name],
  });

  const [apiKey, hasPrivileges, areApiKeysEnabled] = await Promise.all([
    getSyntheticsServiceAPIKey(encryptedClient),
    uptimeEsClient.baseESClient.security.hasPrivileges({
      body: {
        cluster: [
          'manage_security',
          'manage_api_key',
          'manage_own_api_key',
          ...serviceApiKeyPrivileges.cluster,
        ],
        index: serviceApiKeyPrivileges.index,
      },
    }),
    security.authc.apiKeys.areAPIKeysEnabled(),
  ]);

  const { cluster } = hasPrivileges;
  const {
    manage_security: manageSecurity,
    manage_api_key: manageApiKey,
    manage_own_api_key: manageOwnApiKey,
    monitor,
    read_ilm: readILM,
    read_pipeline: readPipeline,
  } = cluster || {};

  const canManageApiKeys = manageSecurity || manageApiKey || manageOwnApiKey;
  const hasClusterPermissions = readILM && readPipeline && monitor;
  const hasIndexPermissions = !Object.values(hasPrivileges.index?.['synthetics-*'] || []).includes(
    false
  );

  return {
    canEnable: canManageApiKeys && hasClusterPermissions && hasIndexPermissions,
    isEnabled: Boolean(apiKey),
    areApiKeysEnabled,
  };
};

export class SyntheticsForbiddenError extends Error {
  constructor() {
    super();
    this.message = 'Forbidden';
    this.name = 'SyntheticsForbiddenError';
  }
}
