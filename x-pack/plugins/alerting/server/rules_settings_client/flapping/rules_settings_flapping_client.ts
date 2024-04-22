/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
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
  RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
  DEFAULT_FLAPPING_SETTINGS,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { flappingSchema } from '../schemas';

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
  readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;
}

export class RulesSettingsFlappingClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getModificationMetadata: () => Promise<RulesSettingsModificationMetadata>;

  constructor(options: RulesSettingsFlappingClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getModificationMetadata = options.getModificationMetadata;
  }

  public async get(): Promise<RulesSettingsFlapping> {
    const rulesSettings = await this.getOrCreate();
    if (!rulesSettings.attributes.flapping) {
      this.logger.error('Failed to get flapping rules setting for current space.');
      throw new Error(
        'Failed to get flapping rules setting for current space. Flapping settings are undefined'
      );
    }
    return rulesSettings.attributes.flapping;
  }

  public async update(newFlappingProperties: RulesSettingsFlappingProperties) {
    return await retryIfConflicts(
      this.logger,
      'ruleSettingsClient.flapping.update()',
      async () => await this.updateWithOCC(newFlappingProperties)
    );
  }

  private async updateWithOCC(newFlappingProperties: RulesSettingsFlappingProperties) {
    try {
      flappingSchema.validate(newFlappingProperties);
      verifyFlappingSettings(newFlappingProperties);
    } catch (e) {
      this.logger.error(
        `Failed to verify new flapping settings properties when updating. Error: ${e}`
      );
      throw e;
    }

    const { attributes, version } = await this.getOrCreate();
    if (!attributes.flapping) {
      throw new Error('Flapping settings are undefined');
    }

    const modificationMetadata = await this.getModificationMetadata();
    try {
      const result = await this.savedObjectsClient.update(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
        {
          flapping: {
            ...attributes.flapping,
            ...newFlappingProperties,
            updatedAt: modificationMetadata.updatedAt,
            updatedBy: modificationMetadata.updatedBy,
          },
        },
        {
          version,
        }
      );
      return result.attributes.flapping;
    } catch (e) {
      const errorMessage = 'savedObjectsClient errored trying to update flapping settings';
      this.logger.error(`${errorMessage}: ${e}`);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  private async getSettings(): Promise<SavedObject<RulesSettings>> {
    return await this.savedObjectsClient.get<RulesSettings>(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID
    );
  }

  private async createSettings(): Promise<SavedObject<RulesSettings>> {
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
          id: RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
          overwrite: true,
        }
      );
    } catch (e) {
      this.logger.error(`Failed to create flapping rules setting for current space. Error: ${e}`);
      throw e;
    }
  }

  /**
   * Helper function to ensure that a rules-settings saved object always exists.
   * Ensures the creation of the saved object is done lazily during retrieval.
   */
  private async getOrCreate(): Promise<SavedObject<RulesSettings>> {
    try {
      return await this.getSettings();
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.logger.info('Creating new default flapping rules settings for current space.');
        return await this.createSettings();
      }
      this.logger.error(`Failed to get flapping rules setting for current space. Error: ${e}`);
      throw e;
    }
  }
}
