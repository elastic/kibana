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
  RulesSettingsFlapping,
  RulesSettingsFlappingProperties,
  RulesSettingsModificationMetadata,
  MIN_LOOK_BACK_WINDOW,
  MAX_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_STATUS_CHANGE_THRESHOLD,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_SAVED_OBJECT_ID,
} from '../../../common';

const verifyFlappingSettings = (flappingSettings: RulesSettingsFlappingProperties) => {
  const { lookBackWindow, statusChangeThreshold } = flappingSettings;

  if (lookBackWindow < MIN_LOOK_BACK_WINDOW || lookBackWindow > MAX_LOOK_BACK_WINDOW) {
    throw Boom.badRequest(
      `Invalid lookBackWindow value, must be between ${MIN_LOOK_BACK_WINDOW} and ${MAX_LOOK_BACK_WINDOW}, but got: ${lookBackWindow}.`
    );
  }

  if (
    statusChangeThreshold < MIN_STATUS_CHANGE_THRESHOLD ||
    statusChangeThreshold > MAX_STATUS_CHANGE_THRESHOLD
  ) {
    throw Boom.badRequest(
      `Invalid statusChangeThreshold value, must be between ${MIN_STATUS_CHANGE_THRESHOLD} and ${MAX_STATUS_CHANGE_THRESHOLD}, but got: ${statusChangeThreshold}.`
    );
  }

  if (lookBackWindow < statusChangeThreshold) {
    throw Boom.badRequest(
      `Invalid values,lookBackWindow (${lookBackWindow}) must be equal to or greater than statusChangeThreshold (${statusChangeThreshold}).`
    );
  }
};

export interface RulesSettingsFlappingClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getOrCreate: () => Promise<SavedObject<RulesSettings>>;
  readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;
}

export class RulesSettingsFlappingClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getOrCreate: () => Promise<SavedObject<RulesSettings>>;
  private readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;

  constructor(options: RulesSettingsFlappingClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getOrCreate = options.getOrCreate;
    this.getModificationMetadata = options.getModificationMetadata;
  }

  public async get(): Promise<RulesSettingsFlapping> {
    const rulesSettings = await this.getOrCreate();
    return rulesSettings.attributes.flapping;
  }

  public async update(newFlappingProperties: RulesSettingsFlappingProperties) {
    try {
      verifyFlappingSettings(newFlappingProperties);
    } catch (e) {
      this.logger.error(
        `Failed to verify new flapping settings properties when updating. Error: ${e}`
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
          flapping: {
            ...attributes.flapping,
            ...newFlappingProperties,
            ...modificationMetadata,
          },
        },
        {
          version,
          retryOnConflict: 3,
        }
      );
      return result.attributes.flapping;
    } catch (e) {
      const errorMessage = 'savedObjectsClient errored trying to update flapping settings';
      this.logger.error(`${errorMessage}: ${e}`);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }
}
