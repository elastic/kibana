/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import {
  RulesSettings,
  RulesSettingsModificationMetadata,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_SAVED_OBJECT_ID,
  RulesSettingsQueryDelayProperties,
  MIN_QUERY_DELAY,
  MAX_QUERY_DELAY,
  RulesSettingsQueryDelay,
} from '../../../common';

const verifyQueryDelaySettings = (settings: RulesSettingsQueryDelayProperties) => {
  const { delay } = settings;

  if (delay < MIN_QUERY_DELAY || delay > MAX_QUERY_DELAY) {
    throw Boom.badRequest(
      `Invalid query delay value, must be between ${MIN_QUERY_DELAY} and ${MAX_QUERY_DELAY}, but got: ${delay}.`
    );
  }
};

export interface RulesSettingsQueryDelayClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getOrCreate: () => Promise<SavedObject<RulesSettings>>;
  readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;
}

export class RulesSettingsQueryDelayClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getOrCreate: () => Promise<SavedObject<RulesSettings>>;
  private readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;

  constructor(options: RulesSettingsQueryDelayClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getOrCreate = options.getOrCreate;
    this.getModificationMetadata = options.getModificationMetadata;
  }

  public async get(): Promise<RulesSettingsQueryDelay> {
    const rulesSettings = await this.getOrCreate();
    return rulesSettings.attributes.queryDelay;
  }

  public async update(newQueryDelayProperties: RulesSettingsQueryDelayProperties) {
    try {
      verifyQueryDelaySettings(newQueryDelayProperties);
    } catch (e) {
      this.logger.error(
        `Failed to verify new query delay settings properties when updating. Error: ${e}`
      );
      throw e;
    }

    const { attributes, version } = await this.getOrCreate();
    const modificationMetadata = await this.getModificationMetadata();

    try {
      const result = await this.savedObjectsClient.update(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_SAVED_OBJECT_ID,
        {
          ...attributes,
          queryDelay: {
            ...attributes.queryDelay,
            ...newQueryDelayProperties,
            updatedAt: modificationMetadata.updatedAt,
            updatedBy: modificationMetadata.updatedBy,
          },
        },
        {
          version,
        }
      );
      return result.attributes.queryDelay;
    } catch (e) {
      const errorMessage = 'savedObjectsClient errored trying to update query delay settings';
      this.logger.error(`${errorMessage}: ${e}`);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }
}
