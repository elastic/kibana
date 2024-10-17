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
  SecurityServiceStart,
} from '@kbn/core/server';
import { RulesSettingsClient } from './rules_settings_client';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE } from '../../common';

export interface RulesSettingsClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
  isServerless: boolean;
  securityService: SecurityServiceStart;
}

export class RulesSettingsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;
  private securityService!: SecurityServiceStart;
  private isServerless = false;

  public initialize(options: RulesSettingsClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('RulesSettingsClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
    this.securityService = options.securityService;
    this.isServerless = options.isServerless;
  }

  private createRulesSettingsClient(request: KibanaRequest, withAuth: boolean) {
    const { securityService } = this;
    const savedObjectsClient = this.savedObjectsService.getScopedClient(request, {
      includedHiddenTypes: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
      ...(withAuth ? {} : { excludedExtensions: [SECURITY_EXTENSION_ID] }),
    });

    return new RulesSettingsClient({
      logger: this.logger,
      savedObjectsClient,
      async getUserName() {
        const user = securityService.authc.getCurrentUser(request);
        return user?.username ?? null;
      },
      isServerless: this.isServerless,
    });
  }

  public createWithAuthorization(request: KibanaRequest) {
    return this.createRulesSettingsClient(request, true);
  }

  public create(request: KibanaRequest) {
    return this.createRulesSettingsClient(request, false);
  }
}
