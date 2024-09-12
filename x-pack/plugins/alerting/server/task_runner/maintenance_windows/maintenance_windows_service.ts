/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { MaintenanceWindow } from '../../application/maintenance_window/types';
import { filterMaintenanceWindowsIds, getMaintenanceWindows } from './get_maintenance_windows';
import { MaintenanceWindowClientApi } from '../../types';
import { AlertingEventLogger } from '../../lib/alerting_event_logger/alerting_event_logger';

interface MaintenanceWindowServiceOpts {
  alertingEventLogger: AlertingEventLogger;
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
  logger: Logger;
}

interface InitializeOpts {
  request: KibanaRequest;
  ruleId: string;
  ruleTypeId: string;
  ruleTypeCategory: string;
}

interface MaintenanceWindowData {
  maintenanceWindows: MaintenanceWindow[];
  maintenanceWindowsWithoutScopedQueryIds: string[];
}

export class MaintenanceWindowsService {
  private readonly logger: Logger;
  private request?: KibanaRequest;
  private ruleId?: string;
  private ruleTypeId?: string;
  private ruleTypeCategory?: string;
  private isInitialized: boolean = false;
  private isLoaded: boolean = false;
  private maintenanceWindows: MaintenanceWindow[] = [];
  private maintenanceWindowsWithoutScopedQueryIds: string[] = [];

  constructor(private readonly options: MaintenanceWindowServiceOpts) {
    this.logger = options.logger;
  }

  public initialize(opts: InitializeOpts) {
    this.request = opts.request;
    this.ruleId = opts.ruleId;
    this.ruleTypeCategory = opts.ruleTypeCategory;
    this.ruleTypeId = opts.ruleTypeId;
    this.isInitialized = true;
  }

  public async loadMaintenanceWindows(): Promise<MaintenanceWindowData> {
    if (this.isLoaded) {
      // don't load if already loaded
      return {
        maintenanceWindows: this.maintenanceWindows,
        maintenanceWindowsWithoutScopedQueryIds: this.maintenanceWindowsWithoutScopedQueryIds,
      };
    }

    if (!this.isInitialized) {
      this.logger.warn(`Not loading maintenance windows because the service is not initialized.`);
      return {
        maintenanceWindows: [],
        maintenanceWindowsWithoutScopedQueryIds: [],
      };
    }

    this.maintenanceWindows = await getMaintenanceWindows({
      fakeRequest: this.request!,
      getMaintenanceWindowClientWithRequest: this.options.getMaintenanceWindowClientWithRequest,
      logger: this.logger,
      ruleId: this.ruleId!,
      ruleTypeId: this.ruleTypeId!,
      ruleTypeCategory: this.ruleTypeCategory!,
    });

    // Set the event log MW Id field the first time with MWs without scoped queries
    this.maintenanceWindowsWithoutScopedQueryIds = filterMaintenanceWindowsIds({
      maintenanceWindows: this.maintenanceWindows,
      withScopedQuery: false,
    });

    if (this.maintenanceWindowsWithoutScopedQueryIds.length) {
      this.options.alertingEventLogger.setMaintenanceWindowIds(
        this.maintenanceWindowsWithoutScopedQueryIds
      );
    }

    this.isLoaded = true;
    return {
      maintenanceWindows: this.maintenanceWindows,
      maintenanceWindowsWithoutScopedQueryIds: this.maintenanceWindowsWithoutScopedQueryIds,
    };
  }
}
