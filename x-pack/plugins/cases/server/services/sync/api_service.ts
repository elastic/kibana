/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { CreateAPIKeyResult } from '@kbn/security-plugin/server';

import { CASE_SYNC_SAVED_OBJECT } from '../../../common/constants';
import type { ServiceContext, SyncApiKey } from './types';

const API_SO_ID = 'sync-api-key-so-id';

export class ApiKeyService {
  constructor(private readonly context: ServiceContext) {}

  public async get(): Promise<SavedObject<SyncApiKey> | undefined> {
    try {
      const apiKeySo = await this.context.unsecuredSavedObjectsClient.get<SyncApiKey>(
        CASE_SYNC_SAVED_OBJECT,
        API_SO_ID
      );

      return apiKeySo;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return;
      }

      this.context.log.error(`Error while retrieving the api key: ${error}`);
      throw error;
    }
  }

  public async create(apiKeyInfo: CreateAPIKeyResult) {
    try {
      await this.context.unsecuredSavedObjectsClient.create(
        CASE_SYNC_SAVED_OBJECT,
        {
          apiKey: apiKeyInfo.api_key,
          apiKeyId: apiKeyInfo.id,
        },
        {
          id: API_SO_ID,
          overwrite: true,
        }
      );
    } catch (error) {
      this.context.log.error(`Error storing api key: ${apiKeyInfo.id} error: ${error}`);
      throw error;
    }
  }
}
