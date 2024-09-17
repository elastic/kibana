/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { RulesSettingsFlappingClient } from './flapping/rules_settings_flapping_client';
import { RulesSettingsQueryDelayClient } from './query_delay/rules_settings_query_delay_client';

export interface RulesSettingsClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getUserName: () => Promise<string | null>;
  readonly isServerless: boolean;
}

export class RulesSettingsClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getUserName: () => Promise<string | null>;
  private readonly _flapping: RulesSettingsFlappingClient;
  private readonly _queryDelay: RulesSettingsQueryDelayClient;
  private readonly isServerless: boolean;

  constructor(options: RulesSettingsClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getUserName = options.getUserName;
    this.isServerless = options.isServerless;

    this._flapping = new RulesSettingsFlappingClient({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      getModificationMetadata: this.getModificationMetadata.bind(this),
    });

    this._queryDelay = new RulesSettingsQueryDelayClient({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      isServerless: this.isServerless,
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

  public flapping(): RulesSettingsFlappingClient {
    return this._flapping;
  }

  public queryDelay(): RulesSettingsQueryDelayClient {
    return this._queryDelay;
  }
}
