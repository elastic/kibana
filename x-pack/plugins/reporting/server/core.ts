/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  DocLinksServiceSetup,
  IBasePath,
  IClusterClient,
  KibanaRequest,
  Logger,
  PackageInfo,
  PluginInitializerContext,
  SavedObjectsServiceStart,
  StatusServiceSetup,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import {
  PdfScreenshotResult,
  PngScreenshotResult,
  ScreenshotOptions,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import * as Rx from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import type { ReportingSetup } from '.';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../common/constants';
import { createConfig, ReportingConfigType } from './config';
import { CsvSearchSourceExportType } from './export_types/csv_searchsource';
import { CsvV2ExportType } from './export_types/csv_v2';
import { PdfV1ExportType } from './export_types/printable_pdf';
import { PdfExportType } from './export_types/printable_pdf_v2';
import { PngExportType } from './export_types/png_v2';
import { checkLicense, ExportTypesRegistry } from './lib';
import { reportingEventLoggerFactory } from './lib/event_logger/logger';
import type { IReport, ReportingStore } from './lib/store';
import { ExecuteReportTask, MonitorReportsTask, ReportTaskParams } from './lib/tasks';
import type { PdfScreenshotOptions, PngScreenshotOptions, ReportingPluginRouter } from './types';
import { CsvSearchSourceImmediateExportType } from './export_types/csv_searchsource_immediate';
import { ExportType } from './export_types/common';

export interface ReportingInternalSetup {
  basePath: Pick<IBasePath, 'set'>;
  router: ReportingPluginRouter;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  usageCounter?: UsageCounter;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  status: StatusServiceSetup;
  docLinks: DocLinksServiceSetup;
}

export interface ReportingInternalStart {
  store: ReportingStore;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  logger: Logger;
  screenshotting?: ScreenshottingStart;
  security?: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

/**
 * @internal
 */
export interface ReportingServerInfo {
  port: number;
  name: string;
  uuid: string;
  basePath: string;
  protocol: string;
  hostname: string;
}

/**
 * @internal
 */
export class ReportingCore {
  private packageInfo: PackageInfo;
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<boolean>(); // observe async background setupDeps each are done
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>(); // observe async background startDeps
  private deprecatedAllowedRoles: string[] | false = false; // DEPRECATED. If `false`, the deprecated features have been disableed
  private executeTask: ExecuteReportTask;
  private monitorTask: MonitorReportsTask;
  private config: ReportingConfigType;
  private executing: Set<string>;
  private exportTypesRegistry = new ExportTypesRegistry();

  public getContract: () => ReportingSetup;

  private kibanaShuttingDown$ = new Rx.ReplaySubject<void>(1);

  constructor(
    private core: CoreSetup,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.packageInfo = context.env.packageInfo;
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;

    this.getExportTypes().forEach((et) => {
      this.exportTypesRegistry.register(et);
    });
    this.deprecatedAllowedRoles = config.roles.enabled ? config.roles.allow : false;
    this.executeTask = new ExecuteReportTask(this, config, this.logger);
    this.monitorTask = new MonitorReportsTask(this, config, this.logger);

    this.getContract = () => ({
      usesUiCapabilities: () => config.roles.enabled === false,
      registerExportTypes: (id) => id,
      getScreenshots: config.statefulSettings.enabled ? this.getScreenshots.bind(this) : undefined,
      getSpaceId: this.getSpaceId.bind(this),
    });

    this.executing = new Set();
  }

  public getKibanaPackageInfo() {
    return this.packageInfo;
  }

  /*
   * Register setupDeps
   */
  public pluginSetup(setupDeps: ReportingInternalSetup) {
    this.pluginSetup$.next(true); // trigger the observer
    this.pluginSetupDeps = setupDeps; // cache

    this.exportTypesRegistry.getAll().forEach((et) => {
      et.setup(setupDeps);
    });

    const { executeTask, monitorTask } = this;
    setupDeps.taskManager.registerTaskDefinitions({
      [executeTask.TYPE]: executeTask.getTaskDefinition(),
      [monitorTask.TYPE]: monitorTask.getTaskDefinition(),
    });
  }

  /*
   * Register startDeps
   */
  public async pluginStart(startDeps: ReportingInternalStart) {
    this.pluginStart$.next(startDeps); // trigger the observer
    this.pluginStartDeps = startDeps; // cache

    this.exportTypesRegistry.getAll().forEach((et) => {
      et.start({ ...startDeps, reporting: this.getContract() });
    });

    const { taskManager } = startDeps;
    const { executeTask, monitorTask } = this;
    // enable this instance to generate reports and to monitor for pending reports
    await Promise.all([executeTask.init(taskManager), monitorTask.init(taskManager)]);
  }

  public pluginStop() {
    this.kibanaShuttingDown$.next();
  }

  public getKibanaShutdown$(): Rx.Observable<void> {
    return this.kibanaShuttingDown$.pipe(take(1));
  }

  /*
   * Blocks the caller until setup is done
   */
  public async pluginSetsUp(): Promise<boolean> {
    // use deps and config as a cached resolver
    if (this.pluginSetupDeps && this.config) {
      return true;
    }
    return await Rx.firstValueFrom(this.pluginSetup$.pipe(take(2))); // once for pluginSetupDeps (sync) and twice for config (async)
  }

  /*
   * Blocks the caller until start is done
   */
  public async pluginStartsUp(): Promise<boolean> {
    return await this.getPluginStartDeps().then(() => true);
  }

  /*
   * Synchronously checks if all async background setup and startup is completed
   */
  public pluginIsStarted() {
    return this.pluginSetupDeps != null && this.config != null && this.pluginStartDeps != null;
  }

  /*
   * Allows config to be set in the background
   */
  public setConfig(config: ReportingConfigType) {
    this.config = config;
    this.pluginSetup$.next(true);
  }

  /**
   * Validate export types with config settings
   * only CSV export types should be registered in the export types registry for serverless
   */
  private getExportTypes(): ExportType[] {
    const { csv, pdf, png } = this.config.export_types;
    const exportTypes = [];

    if (csv.enabled) {
      // NOTE: CsvSearchSourceExportType should be deprecated and replaced with V2 in the UI: https://github.com/elastic/kibana/issues/151190
      exportTypes.push(
        new CsvSearchSourceExportType(this.core, this.config, this.logger, this.context)
      );
      exportTypes.push(new CsvV2ExportType(this.core, this.config, this.logger, this.context));
    }

    if (pdf.enabled) {
      // NOTE: PdfV1ExportType is deprecated and tagged for removal: https://github.com/elastic/kibana/issues/154601
      exportTypes.push(new PdfV1ExportType(this.core, this.config, this.logger, this.context));
      exportTypes.push(new PdfExportType(this.core, this.config, this.logger, this.context));
    }

    if (png.enabled) {
      exportTypes.push(new PngExportType(this.core, this.config, this.logger, this.context));
    }

    return exportTypes;
  }

  /**
   * If xpack.reporting.roles.enabled === true, register Reporting as a feature
   * that is controlled by user role names
   */
  public registerFeature() {
    const { features } = this.getPluginSetupDeps();
    const deprecatedRoles = this.getDeprecatedAllowedRoles();

    if (deprecatedRoles !== false) {
      // refer to roles.allow configuration (deprecated path)
      const allowedRoles = ['superuser', ...(deprecatedRoles ?? [])];
      const privileges = allowedRoles.map((role) => ({
        requiredClusterPrivileges: [],
        requiredRoles: [role],
        ui: [],
      }));

      // self-register as an elasticsearch feature (deprecated)
      features.registerElasticsearchFeature({
        id: 'reporting',
        catalogue: ['reporting'],
        management: {
          insightsAndAlerting: ['reporting'],
        },
        privileges,
      });
    } else {
      this.logger.debug(
        `Reporting roles configuration is disabled. Please assign access to Reporting use Kibana feature controls for applications.`
      );
      // trigger application to register Reporting as a subfeature
      features.enableReportingUiCapabilities();
    }
  }

  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
    const { http } = this.core;
    const serverInfo = http.getServerInfo();
    return {
      basePath: this.core.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }

  /*
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfigType {
    return this.config;
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

  /*
   * Gives async access to the startDeps
   */
  public async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }

    return await Rx.firstValueFrom(this.pluginStart$);
  }

  public getExportTypesRegistry() {
    return this.exportTypesRegistry;
  }

  public async scheduleTask(report: ReportTaskParams) {
    return await this.executeTask.scheduleTask(report);
  }

  public async getStore() {
    return (await this.getPluginStartDeps()).store;
  }

  public async getLicenseInfo() {
    const { license$ } = (await this.getPluginStartDeps()).licensing;
    const registry = this.getExportTypesRegistry();

    return await Rx.firstValueFrom(
      license$.pipe(map((license) => checkLicense(registry, license)))
    );
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

  public async getDataViewsService(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    const savedObjectsClient = savedObjects.getScopedClient(request);
    const { indexPatterns } = await this.getDataService();
    const { asCurrentUser: esClient } = (await this.getEsClient()).asScoped(request);
    const dataViews = await indexPatterns.dataViewsServiceFactory(savedObjectsClient, esClient);

    return dataViews;
  }

  public async getDataService() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.data;
  }

  public async getEsClient() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.esClient;
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

  public getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  public getScreenshots(options: PngScreenshotOptions): Rx.Observable<PngScreenshotResult>;
  public getScreenshots(
    options: PngScreenshotOptions | PdfScreenshotOptions
  ): Rx.Observable<PngScreenshotResult | PdfScreenshotResult> {
    return Rx.defer(() => this.getPluginStartDeps()).pipe(
      switchMap(({ screenshotting }) => {
        return screenshotting!.getScreenshots({
          ...options,
          urls: options.urls.map((url) =>
            typeof url === 'string'
              ? url
              : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
          ),
        } as ScreenshotOptions);
      })
    );
  }

  public trackReport(reportId: string) {
    this.executing.add(reportId);
  }

  public untrackReport(reportId: string) {
    this.executing.delete(reportId);
  }

  public countConcurrentReports(): number {
    return this.executing.size;
  }

  public getEventLogger(report: IReport, task?: { id: string }) {
    const ReportingEventLogger = reportingEventLoggerFactory(this.logger);
    return new ReportingEventLogger(report, task);
  }

  public async getCsvSearchSourceImmediate() {
    const startDeps = await this.getPluginStartDeps();

    const csvImmediateExport = new CsvSearchSourceImmediateExportType(
      this.core,
      this.config,
      this.logger,
      this.context
    );
    csvImmediateExport.setup(this.getPluginSetupDeps());
    csvImmediateExport.start({ ...startDeps, reporting: this.getContract() });
    return csvImmediateExport;
  }
}
