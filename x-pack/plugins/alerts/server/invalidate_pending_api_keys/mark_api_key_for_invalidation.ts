/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, SavedObjectsClientContract } from 'src/core/server';

export const markApiKeyForInvalidation = async (
  { apiKey }: { apiKey: string | null },
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  if (!apiKey) {
    return;
  }
  try {
    const apiKeyId = Buffer.from(Buffer.from(apiKey, 'base64').toString().split(':')[0]).toString(
      'base64'
    );
    await savedObjectsClient.create('api_key_pending_invalidation', {
      apiKeyId,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    logger.error(`Failed to mark for API key [id="${apiKey}"] for invalidation: ${e.message}`);
  }
};
