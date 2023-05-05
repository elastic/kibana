/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DocLinksServiceSetup,
  IClusterClient,
  IRouter,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  SavedObjectsClientContract,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { ReportingConfig } from '@kbn/reporting-plugin/server';
import { ReportingConfigType } from '@kbn/reporting-plugin/server/config/schema';
import { checkLicense, ExportTypesRegistry } from '@kbn/reporting-plugin/server/lib';
import { reportingEventLoggerFactory } from '@kbn/reporting-plugin/server/lib/event_logger/logger';
import { IReport, ReportingStore } from '@kbn/reporting-plugin/server/lib/store';
import { ReportTaskParams } from '@kbn/reporting-plugin/server/lib/tasks';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import * as Rx from 'rxjs';
import { take, map } from 'rxjs/operators';
import { ExecuteReportTask } from './routes/lib/execute_report';

export interface ReportingExportTypesSetupDeps {
  spaces?: SpacesPluginSetup;
  docLinks: DocLinksServiceSetup;
  router: IRouter<any>;
  security?: SecurityPluginSetup;
  usageCounter?: UsageCounter;
  logger: Logger;
  exportTypesRegistry: ExportTypesRegistry;
}

export interface ReportingExportTypesStartDeps {
  licensing: LicensingPluginStart;
  store: ReportingStore;
  esClient: IClusterClient;
  data: DataPluginStart;
  logger: Logger;
  security?: SecurityPluginStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
}

export class ReportingExportTypesCore {
  private pluginSetupDeps?: ReportingExportTypesSetupDeps;
  private pluginStartDeps?: ReportingExportTypesStartDeps;
  private readonly pluginSetup$ = new Rx.ReplaySubject<boolean>(); // observe async background setupDeps and config each are done
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingExportTypesStartDeps>(); // observe async background startDeps
  private deprecatedAllowedRoles: false | string[] = false; // DEPRECATED. If `false`, the deprecated features have been disableed
  private executeTask: ExecuteReportTask;
  private executing: Set<string>;
  private kibanaShuttingDown$ = new Rx.ReplaySubject<void>(1);
  private config?: ReportingConfigType;

  constructor(private logger: Logger, context: PluginInitializerContext) {
    // this.packageInfo = context.env.packageInfo;
    const syncConfig = context.config.get<ReportingConfigType>();
    this.executeTask = new ExecuteReportTask(this, syncConfig, this.logger);

    this.executing = new Set();
  }

  /*
   * Gives synchronous access to the setupDeps
   */
  public getPluginSetupDeps() {
    if (!this.pluginSetupDeps) {
      throw new Error(`"pluginSetupDeps" dependencies haven't initialized yet`);
    }
    return this.pluginSetupDeps;
  }

  /*
   * Gives async access to the startDeps
   */
  public async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }

    return await Rx.firstValueFrom(this.pluginStart$);
  }
  /*
   * If deprecated feature has not been disabled,
   * this returns an array of allowed role names
   * that have access to Reporting.
   */
  public getDeprecatedAllowedRoles(): string[] | false {
    return this.deprecatedAllowedRoles;
  }

  /*
   *
   * Track usage of code paths for telemetry
   */
  public getUsageCounter(): UsageCounter | undefined {
    return this.pluginSetupDeps?.usageCounter;
  }

  public getEventLogger(report: IReport, task?: { id: string }) {
    const ReportingEventLogger = reportingEventLoggerFactory(this.logger);
    return new ReportingEventLogger(report, task);
  }

  public getConfig(): ReportingConfig {
    if (!this.config) {
      throw new Error('Config is not yet initialized');
    }
    return this.config as unknown as ReportingConfig;
  }

  public async getDataService() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.data;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getEsClient() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.esClient;
  }

  public async getStore() {
    return (await this.getPluginStartDeps()).store;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    if (spacesService) {
      const spaceId = spacesService?.getSpaceId(request);

      if (spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Request uses Space ID: ${spaceId}`);
        return spaceId;
      } else {
        logger.debug(`Request uses default Space`);
      }
    }
  }

  public async scheduleTask(report: ReportTaskParams) {
    return await this.executeTask.scheduleTask(report);
  }

  public getExportTypesRegistry() {
    return this.getPluginSetupDeps().exportTypesRegistry;
  }

  public countConcurrentReports(): number {
    return this.executing.size;
  }

  public trackReport(reportId: string) {
    this.executing.add(reportId);
  }

  public untrackReport(reportId: string) {
    this.executing.delete(reportId);
  }

  public getKibanaShutdown$(): Rx.Observable<void> {
    return this.kibanaShuttingDown$.pipe(take(1));
  }

  /*
   * Allows config to be set in the background
   */
  public setConfig(config: ReportingConfig) {
    // @ts-ignore
    this.config = config;
    this.pluginSetup$.next(true);
  }

  /**
   * License registry
   */
  public async getLicenseInfo() {
    const { license$ } = (await this.getPluginStartDeps()).licensing;
    const registry = this.getExportTypesRegistry();

    return await Rx.firstValueFrom(
      license$.pipe(map((license: any) => checkLicense(registry, license)))
    );
  }
}
