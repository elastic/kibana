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
import { AlertingAuditClient } from './alerting_audit_client';
import { ALERTING_AUDIT_SAVED_OBJECT_TYPE } from '../../../common';

export interface MaintenanceWindowClientFactoryOpts {
  logger: Logger;
  savedObjectsService: SavedObjectsServiceStart;
}

export class AlertingAuditClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsService!: SavedObjectsServiceStart;

  public initialize(options: MaintenanceWindowClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AuditClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsService = options.savedObjectsService;
  }

  private createClient(request: KibanaRequest, withAuth: boolean) {
    const savedObjectsClient = this.savedObjectsService.getScopedClient(request, {
      includedHiddenTypes: [ALERTING_AUDIT_SAVED_OBJECT_TYPE],
      ...(withAuth ? {} : { excludedExtensions: [SECURITY_EXTENSION_ID] }),
    });

    return new AlertingAuditClient({
      logger: this.logger,
      savedObjectsClient,
    });
  }

  public createWithAuthorization(request: KibanaRequest) {
    return this.createClient(request, true);
  }

  public create(request: KibanaRequest) {
    return this.createClient(request, false);
  }
}
