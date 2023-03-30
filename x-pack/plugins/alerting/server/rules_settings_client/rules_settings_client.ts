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

export interface RulesSettingsClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getUserName: () => Promise<string | null>;
}

export class RulesSettingsClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getUserName: () => Promise<string | null>;
  private readonly _flapping: RulesSettingsFlappingClient;

  constructor(options: RulesSettingsClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getUserName = options.getUserName;

    this._flapping = new RulesSettingsFlappingClient({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      getOrCreate: this.getOrCreate.bind(this),
      getModificationMetadata: this.getModificationMetadata.bind(this),
    });
  }

  private async getModificationMetadata() {
    const createTime = Date.now();
    const userName = await this.getUserName();

    return {
      createdBy: userName,
      updatedBy: userName,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
    };
  }

  public async get(): Promise<SavedObject<RulesSettings>> {
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

  public async create(): Promise<SavedObject<RulesSettings>> {
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

  /**
   * Helper function to ensure that a rules-settings saved object always exists.
   * Enabled the creation of the saved object is done lazily during retrieval.
   */
  private async getOrCreate(): Promise<SavedObject<RulesSettings>> {
    try {
      return await this.get();
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.logger.info('Creating new default rules settings for current space.');
        return await this.create();
      }
      this.logger.error(`Failed to persist rules setting for current space. Error: ${e}`);
      throw e;
    }
  }

  public flapping(): RulesSettingsFlappingClient {
    return this._flapping;
  }
}
