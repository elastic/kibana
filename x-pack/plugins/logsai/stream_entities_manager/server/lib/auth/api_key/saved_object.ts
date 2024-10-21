/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { ApiKeySavedObject } from '../../../saved_objects';
import { StreamEntitiesManagerServer } from '../../../types';
import { APIKey } from './api_key';

export const SEM_API_KEY_SO_ID = '06d0114b-90d2-4b88-9aca-fc550eb6e88f';

const getEncryptedSOClient = (server: StreamEntitiesManagerServer) => {
  return server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [ApiKeySavedObject.name],
  });
};

export const readStreamEntitiesManagerAPIKey = async (
  server: StreamEntitiesManagerServer,
  id = SEM_API_KEY_SO_ID
) => {
  try {
    const soClient = getEncryptedSOClient(server);
    const obj = await soClient.getDecryptedAsInternalUser<APIKey>(ApiKeySavedObject.name, id);
    return obj?.attributes;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  }
};

export const saveStreamEntitiesManagerAPIKey = async (
  soClient: SavedObjectsClientContract,
  apiKey: APIKey,
  id = SEM_API_KEY_SO_ID
) => {
  await soClient.create(ApiKeySavedObject.name, apiKey, {
    id,
    overwrite: true,
    managed: true,
  });
  return apiKey;
};

export const deleteStreamEntitiesManagerAPIKey = async (
  soClient: SavedObjectsClientContract,
  id = SEM_API_KEY_SO_ID
) => {
  await soClient.delete(ApiKeySavedObject.name, id);
};
