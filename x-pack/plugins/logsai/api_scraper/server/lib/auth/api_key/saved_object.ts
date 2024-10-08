/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { apiScraperApiKeyType } from '../../../saved_objects';
import { ApiScraperServer } from '../../../types';
import { ApiScraperAPIKey } from './api_key';

export const API_SCRAPER_API_KEY_SO_ID = '06d0114b-90d2-4b88-9aca-fc550eb6e88f';

const getEncryptedSOClient = (server: ApiScraperServer) => {
  return server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [apiScraperApiKeyType.name],
  });
};

export const readApiScraperAPIKey = async (
  server: ApiScraperServer,
  id = API_SCRAPER_API_KEY_SO_ID
) => {
  try {
    const soClient = getEncryptedSOClient(server);
    const obj = await soClient.getDecryptedAsInternalUser<ApiScraperAPIKey>(
      apiScraperApiKeyType.name,
      id
    );
    return obj?.attributes;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  }
};

export const saveApiScraperAPIKey = async (
  soClient: SavedObjectsClientContract,
  apiKey: ApiScraperAPIKey,
  id = API_SCRAPER_API_KEY_SO_ID
) => {
  await soClient.create(apiScraperApiKeyType.name, apiKey, {
    id,
    overwrite: true,
    managed: true,
  });
};

export const deleteApiScraperAPIKey = async (
  soClient: SavedObjectsClientContract,
  id = API_SCRAPER_API_KEY_SO_ID
) => {
  await soClient.delete(apiScraperApiKeyType.name, id);
};
