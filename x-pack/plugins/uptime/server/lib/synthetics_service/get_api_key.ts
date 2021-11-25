/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { EncryptedSavedObjectsPluginStart } from '../../../../encrypted_saved_objects/server';
import { SecurityPluginStart } from '../../../../security/server';
import {
  getSyntheticsServiceAPIKey,
  setSyntheticsServiceApiKey,
  syntheticsServiceApiKey,
} from '../saved_objects/service_api_key';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';

export const getAPIKeyForSyntheticsService = async ({
  encryptedSavedObject,
  savedObjectsClient,
  request,
  security,
}: {
  encryptedSavedObject: EncryptedSavedObjectsPluginStart;
  request: KibanaRequest;
  security: SecurityPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SyntheticsServiceApiKey | Error | undefined> => {
  const encryptedClient = encryptedSavedObject.getClient({
    includedHiddenTypes: [syntheticsServiceApiKey.name],
  });

  const apiKey = await getSyntheticsServiceAPIKey(encryptedClient);
  if (apiKey) {
    return apiKey;
  }
  return await generateAndSaveAPIKey({ request, security, savedObjectsClient });
};

export const generateAndSaveAPIKey = async ({
  security,
  request,
  savedObjectsClient,
}: {
  security: SecurityPluginStart;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  try {
    const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

    if (!isApiKeysEnabled) {
      return new Error('Please enable API keys in kibana to use synthetics service.');
    }

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
      // discard decoded key and rest of the keys
      await setSyntheticsServiceApiKey(savedObjectsClient, apiKeyObject);
      return apiKeyObject;
    }
  } catch (e) {
    throw e;
  }
};
