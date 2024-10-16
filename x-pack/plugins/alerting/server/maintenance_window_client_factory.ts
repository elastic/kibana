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
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { MaintenanceWindowClient } from './maintenance_window_client';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../common';

export interface MaintenanceWindowClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
  securityPluginStart?: SecurityPluginStart;
  uiSettings: UiSettingsServiceStart;
}

export class MaintenanceWindowClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;
  private securityPluginStart?: SecurityPluginStart;
  private uiSettings!: UiSettingsServiceStart;

  public initialize(options: MaintenanceWindowClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('MaintenanceWindowClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
    this.securityPluginStart = options.securityPluginStart;
    this.uiSettings = options.uiSettings;
  }

  private createMaintenanceWindowClient(request: KibanaRequest, withAuth: boolean) {
    const { securityPluginStart } = this;
    const savedObjectsClient = this.savedObjectsService.getScopedClient(request, {
      includedHiddenTypes: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
      ...(withAuth ? {} : { excludedExtensions: [SECURITY_EXTENSION_ID] }),
    });

    const uiSettingClient = this.uiSettings.asScopedToClient(savedObjectsClient);

    return new MaintenanceWindowClient({
      logger: this.logger,
      savedObjectsClient,
      uiSettings: uiSettingClient,
      async getUserName() {
        if (!securityPluginStart || !request) {
          return null;
        }
        const user = securityPluginStart.authc.getCurrentUser(request);
        return user ? user.username : null;
      },
    });
  }

  public createWithAuthorization(request: KibanaRequest) {
    return this.createMaintenanceWindowClient(request, true);
  }

  public create(request: KibanaRequest) {
    return this.createMaintenanceWindowClient(request, false);
  }
}
