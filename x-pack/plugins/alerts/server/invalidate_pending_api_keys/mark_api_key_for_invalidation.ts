/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, SavedObjectsClientContract } from 'src/core/server';

export const markApiKeyForInvalidation = async (
  { apiKey }: { apiKey: string | null },
  logger: Logger,
  internalSavedObjectsRepository: SavedObjectsClientContract
): Promise<void> => {
  if (!apiKey) {
    return;
  }
  const apiKeyId = Buffer.from(apiKey, 'base64').toString().split(':')[0];
  try {
    await internalSavedObjectsRepository.create('api_key_pending_invalidation', {
      apiKeyId,
    });
  } catch (e) {
    logger.error(`Failed to mark for API key [id="${apiKeyId}"] for invalidation: ${e.message}`);
  }
};
