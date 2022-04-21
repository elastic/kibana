/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';

export const bulkMarkApiKeysForInvalidation = async (
  { apiKeys }: { apiKeys: string[] },
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  try {
    const apiKeyIds = apiKeys.map(
      (apiKey) => Buffer.from(apiKey, 'base64').toString().split(':')[0]
    );
    await savedObjectsClient.bulkCreate(
      apiKeyIds.map((apiKeyId) => ({
        attributes: {
          apiKeyId,
          createdAt: new Date().toISOString(),
        },
        type: 'api_key_pending_invalidation',
      }))
    );
  } catch (e) {
    logger.error(
      `Failed to bulk mark list of API keys [${apiKeys
        .map((key) => `"${key}"`)
        .join(', ')}] for invalidation: ${e.message}`
    );
  }
};
