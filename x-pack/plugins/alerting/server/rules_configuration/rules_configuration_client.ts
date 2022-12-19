/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObject,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { RulesConfiguration } from '../../common';

type SavedObjectsClient = SavedObjectsClientContract | ISavedObjectsRepository;

const MIN_LOOK_BACK_WINDOW = 2;
const MAX_LOOK_BACK_WINDOW = 20;

const MIN_STATUS_CHANGE_THRESHOLD = 3;
const MAX_STATUS_CHANGE_THRESHOLD = 20;

const DEFAULT_RULES_CONFIGURATION: RulesConfiguration = {
  flapping: {
    enabled: true,
    lookBackWindow: 10,
    statusChangeThreshold: 10,
  },
};

const verifyRulesConfiguration = (rulesConfiguration: RulesConfiguration) => {
  const { flapping } = rulesConfiguration;
  const { lookBackWindow, statusChangeThreshold } = flapping;

  if (lookBackWindow < MIN_LOOK_BACK_WINDOW || lookBackWindow > MAX_LOOK_BACK_WINDOW) {
    throw new Error(
      `Invalid lookBackWindow value, must be between ${MIN_LOOK_BACK_WINDOW} and ${MAX_LOOK_BACK_WINDOW}, but got: ${lookBackWindow}.`
    );
  }

  if (
    statusChangeThreshold < MIN_STATUS_CHANGE_THRESHOLD ||
    statusChangeThreshold > MAX_STATUS_CHANGE_THRESHOLD
  ) {
    throw new Error(
      `Invalid statusChangeThreshold value, must be between ${MIN_STATUS_CHANGE_THRESHOLD} and ${MAX_STATUS_CHANGE_THRESHOLD}, but got: ${statusChangeThreshold}`
    );
  }
};

export interface ConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClient;
}

export class RulesConfigurationClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClient;

  constructor(options: ConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
  }

  private async get(): Promise<SavedObject<RulesConfiguration> | undefined> {
    const { saved_objects: savedObjects } = await this.savedObjectsClient.find<RulesConfiguration>({
      type: 'rules_configuration',
    });
    return savedObjects[0];
  }

  private create(
    rulesConfiguration?: RulesConfiguration
  ): Promise<SavedObject<RulesConfiguration>> {
    this.logger.info('Creating new rules configuration');
    try {
      if (rulesConfiguration) {
        verifyRulesConfiguration(rulesConfiguration);
      }
    } catch (e) {
      this.logger.error('Failed to create new rules configuration', e);
      throw e;
    }
    return this.savedObjectsClient.create<RulesConfiguration>(
      'rules_configuration',
      rulesConfiguration ?? DEFAULT_RULES_CONFIGURATION,
      {
        overwrite: true,
      }
    );
  }

  private update(
    id: string,
    newRulesConfiguration: RulesConfiguration
  ): Promise<SavedObjectsUpdateResponse<RulesConfiguration>> {
    this.logger.info(`Updating rules configuration with ${newRulesConfiguration}`);
    try {
      verifyRulesConfiguration(newRulesConfiguration);
    } catch (e) {
      this.logger.error('Failed to update rules configuration', e);
      throw e;
    }
    return this.savedObjectsClient.update<RulesConfiguration>(
      'rules_configuration',
      id,
      newRulesConfiguration
    );
  }

  public async getOrCreate(): Promise<SavedObject<RulesConfiguration>> {
    const existingRulesConfiguration = await this.get();
    if (!existingRulesConfiguration) {
      this.logger.info(
        'Rules configuration not found, initializing new configuration for the current space'
      );
      return this.create();
    }
    return existingRulesConfiguration;
  }

  public async updateOrCreate(
    rulesConfiguration: RulesConfiguration
  ): Promise<SavedObject<RulesConfiguration> | SavedObjectsUpdateResponse<RulesConfiguration>> {
    const existingRulesConfiguration = await this.get();
    if (!existingRulesConfiguration) {
      this.logger.info(
        'Rules configuration not found, initializing new configuration for the current space'
      );
      return this.create(rulesConfiguration);
    }
    return this.update(existingRulesConfiguration.id, rulesConfiguration);
  }
}
