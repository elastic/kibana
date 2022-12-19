/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  SECURITY_EXTENSION_ID,
} from '@kbn/core/server';
import { RulesConfigurationClient } from './rules_configuration/rules_configuration_client';

export interface RulesConfigurationClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
}

export class RulesConfigurationClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;

  public initialize(options: RulesConfigurationClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('RulesConfigurationClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
  }

  private createClient(request?: KibanaRequest) {
    if (!this.isInitialized) {
      throw new Error('RulesConfigurationClientFactory has not been initialized');
    }

    const savedObjectsClient = request
      ? this.savedObjectsService.getScopedClient(request, {
          excludedExtensions: [SECURITY_EXTENSION_ID],
          includedHiddenTypes: ['rules_configuration'],
        })
      : this.savedObjectsService.createInternalRepository(['rules_configuration']);

    return new RulesConfigurationClient({
      logger: this.logger,
      savedObjectsClient,
    });
  }

  public asScoped(request: KibanaRequest) {
    return this.createClient(request);
  }

  public asInternal() {
    return this.createClient();
  }
}
