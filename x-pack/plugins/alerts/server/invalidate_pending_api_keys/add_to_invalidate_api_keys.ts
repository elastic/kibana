/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, ISavedObjectsRepository } from 'src/core/server';

export const addToInvalidateApiKeys = async (
  { apiKey }: { apiKey: string | null },
  logger: Logger,
  internalSavedObjectsRepository: ISavedObjectsRepository
): Promise<void> => {
  if (!apiKey) {
    return;
  }

  try {
    const apiKeyId = Buffer.from(apiKey, 'base64').toString().split(':')[0];
    await internalSavedObjectsRepository.create('invalidate_pending_api_key', {
      apiKeyId,
    });
  } catch (e) {
    logger.error(`Failed to mark for invalidating API Key: ${e.message}`);
  }
};
