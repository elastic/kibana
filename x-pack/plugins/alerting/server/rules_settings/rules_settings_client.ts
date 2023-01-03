/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { RulesSettingsFlappingClient } from './flapping/rules_settings_flapping_client';
import {
  RulesSettings,
  DEFAULT_FLAPPING_SETTINGS,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_SAVED_OBJECT_ID,
} from '../../common';

export interface ConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getUserName: () => Promise<string | null>;
}

export class RulesSettingsClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getUserName: () => Promise<string | null>;
  public readonly flapping: RulesSettingsFlappingClient;

  constructor(options: ConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getUserName = options.getUserName;

    this.flapping = new RulesSettingsFlappingClient({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      persist: this.persist.bind(this),
      getModificationMetadata: this.getModificationMetadata.bind(this),
    });
  }

  private async getModificationMetadata() {
    const createTime = Date.now();
    const username = await this.getUserName();

    return {
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
    };
  }

  private async get(): Promise<SavedObject<RulesSettings>> {
    try {
      return await this.savedObjectsClient.get<RulesSettings>(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_SAVED_OBJECT_ID
      );
    } catch (e) {
      this.logger.error(`Failed to get rules setting for current space. Error: ${e}`);
      throw e;
    }
  }

  private async create(): Promise<SavedObject<RulesSettings>> {
    const modificationMetadata = await this.getModificationMetadata();

    try {
      return await this.savedObjectsClient.create<RulesSettings>(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        {
          flapping: {
            ...DEFAULT_FLAPPING_SETTINGS,
            ...modificationMetadata,
          },
        },
        {
          id: RULES_SETTINGS_SAVED_OBJECT_ID,
          overwrite: true,
        }
      );
    } catch (e) {
      this.logger.error(`Failed to create rules setting for current space. Error: ${e}`);
      throw e;
    }
  }

  private async persist(): Promise<SavedObject<RulesSettings>> {
    try {
      return await this.get();
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.logger.info('Creating new default rules settings for current space.');
        return await this.create();
      }
      throw e;
    }
  }
}
