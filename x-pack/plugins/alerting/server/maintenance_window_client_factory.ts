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
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../common';

export interface MaintenanceWindowClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
  securityPluginStart?: SecurityPluginStart;
}

export class MaintenanceWindowClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;
  private securityPluginStart?: SecurityPluginStart;

  public initialize(options: MaintenanceWindowClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('MaintenanceWindowClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
    this.securityPluginStart = options.securityPluginStart;
  }
  
  private createMaintenanceWindowClient(request: KibanaRequest, withAuth: boolean) {

  }

  public createWithAuthorization(request: KibanaRequest) {

  }

  public create(request: KibanaRequest) {

  }
}
