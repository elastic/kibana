/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { map, take } from 'rxjs';

import {
  AnalyticsServiceStart,
  CoreSetup,
  DocLinksServiceSetup,
  Headers,
  IBasePath,
  IClusterClient,
  KibanaRequest,
  Logger,
  PackageInfo,
  PluginInitializerContext,
  SavedObjectsServiceStart,
  SecurityServiceStart,
  StatusServiceSetup,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import { CsvSearchSourceExportType, CsvV2ExportType } from '@kbn/reporting-export-types-csv';
import { PdfExportType, PdfV1ExportType } from '@kbn/reporting-export-types-pdf';
import { PngExportType } from '@kbn/reporting-export-types-png';
import type { ReportingConfigType } from '@kbn/reporting-server';
import { ExportType } from '@kbn/reporting-server';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { HTTPAuthorizationHeader, SecurityPluginSetup } from '@kbn/security-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { checkLicense } from '@kbn/reporting-server/check_license';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import type { ReportingSetup } from '.';
import { createConfig } from './config';
import { reportingEventLoggerFactory } from './lib/event_logger/logger';
import type { IReport, ReportingStore } from './lib/store';
import { ExecuteReportTask, ReportTaskParams } from './lib/tasks';
import type { ReportingPluginRouter } from './types';
import { EventTracker } from './usage';

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
  analytics: AnalyticsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  logger: Logger;
  screenshotting?: ScreenshottingStart;
  securityService: SecurityServiceStart;
  taskManager: TaskManagerStartContract;
}

/**
 * HTTP headers extracted from the user request that will be used to generate the report.
 */
export interface ReportHeaders {
  /**
   * HTTP headers to be used for the report generation (unencrypted).
   */
  headers: Headers;

  /**
   * Whether the report generation should use a dedicated API key instead of the user's bearer token.
   */
  usesDedicatedApiKey: boolean;
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

    this.getContract = () => ({
      usesUiCapabilities: () => config.roles.enabled === false,
      registerExportTypes: (id) => id,
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

    const { executeTask } = this;
    setupDeps.taskManager.registerTaskDefinitions({
      [executeTask.TYPE]: executeTask.getTaskDefinition(),
    });
  }

  /*
   * Register startDeps
   */
  public async pluginStart(startDeps: ReportingInternalStart) {
    this.pluginStart$.next(startDeps); // trigger the observer
    this.pluginStartDeps = startDeps; // cache

    this.exportTypesRegistry.getAll().forEach((et) => {
      et.start({ ...startDeps });
    });

    const { taskManager } = startDeps;
    const { executeTask } = this;
    // enable this instance to generate reports
    await Promise.all([executeTask.init(taskManager)]);
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
   * Prepares the request headers for the report job to rely on while generating report.
   * @param req The user request that triggered report generation.
   */
  public async prepareReportHeaders(req: KibanaRequest): Promise<ReportHeaders> {
    // If there is no authorization header, or it isn't a bearer token, we don't need to replace it with an API key
    // since the user credentials ether cannot expire (basic credentials) or the expiration is controlled by the
    // client (api key).
    const reportHeaders = { headers: req.headers, usesDedicatedApiKey: false };
    const authorization = HTTPAuthorizationHeader.parseFromRequest(req);
    if (!authorization || authorization.scheme.toLowerCase() !== 'bearer') {
      return reportHeaders;
    }

    // If the API keys are not enabled, we cannot replace the bearer token with an API key.
    const authc = this.pluginStartDeps?.securityService.authc;
    if (!authc || !(await authc.apiKeys.areAPIKeysEnabled())) {
      this.logger.debug(
        'API keys are not enabled, cannot replace the bearer token with an API key.'
      );
      return reportHeaders;
    }

    // If user isn't an interactive user, we don't need to replace the bearer token with an API key, since client is
    // responsible for the expiration of the credentials they use.
    const reportOwner = authc.getCurrentUser(req);
    if (!reportOwner || reportOwner.authentication_provider.type === 'http') {
      this.logger.debug(
        'Cannot replace the bearer token with an API key for a non-interactive client.'
      );
      return reportHeaders;
    }

    // QUESTION #1: Can we estimate how many keys we'll have to generate on average? In this case we only care about
    // interactive/browser users, so we can probably assume that the number of keys will be relatively low?
    const apiKey = await authc.apiKeys.grantAsInternalUser(req, {
      // QUESTION #2: Should we use the user's name as the API key name, or is there any other useful information we can
      // include into the API key name or metadata (e.g., job ID or something along these lines)?
      name: 'reporting-job',
      // QUESTION #3: Should it be configurable? If yes, what should be the default expiration time? If not, what should
      // be the maximum expiration time? We should make it as small as reasonable.
      expiration: '1h',
      // Retain the same privileges.
      role_descriptors: {},
      // Mark the key as managed by the Kibana (can be filtered out in the UI).
      metadata: { managed: true },
    });

    // If for some reason we failed to create an API key, we shouldn't fail and use the original bearer token instead.
    if (!apiKey) {
      this.logger.error(
        'Failed to create an API key for the reporting job, using the original bearer token.'
      );
      return reportHeaders;
    }

    this.logger.debug(
      'Successfully replaced user bearer token with an API key for the reporting job.'
    );

    return {
      usesDedicatedApiKey: true,
      headers: {
        ...reportHeaders.headers,
        authorization: `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`,
      },
    };
  }

  /**
   * Disposes the API key used for the report job, if it was created.
   * @param reportHeaders The HTTP request headers that were used to generate report with a flag indicating whether the
   * Reporting generated dedicated API key that needs to be invalidated.
   * @param headers The headers used for the report job.
   */
  public async disposeReportHeaders({ usesDedicatedApiKey, headers }: ReportHeaders) {
    if (!usesDedicatedApiKey) {
      return;
    }

    const authorization = HTTPAuthorizationHeader.parseFromRequest({ headers });
    if (!authorization || authorization.scheme.toLowerCase() !== 'apikey') {
      throw new Error(
        'The API key is expected to be used for the report job was not found in headers.'
      );
    }

    // API keys are invalidated by their ID, that is encoded in the API key value.
    const apiKeys = this.pluginStartDeps?.securityService?.authc.apiKeys;
    await apiKeys?.invalidateAsInternalUser({
      ids: [Buffer.from(authorization.credentials, 'base64').toString().split(':')[0]],
    });
  }

  /**
   * Validate export types with config settings
   * only CSV export types should be registered in the export types registry for serverless
   */
  private getExportTypes(): ExportType[] {
    const { csv, pdf, png } = this.config.export_types;
    const exportTypes: ExportType[] = [];

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
   * Track usage of API endpoints
   */
  public getUsageCounter(): UsageCounter | undefined {
    return this.pluginSetupDeps?.usageCounter;
  }

  /*
   * Track metrics of internal events
   */
  public getEventTracker(
    reportId: string,
    exportType: string,
    objectType: string
  ): EventTracker | undefined {
    const { analytics } = this.pluginStartDeps ?? {};
    if (analytics) {
      return new EventTracker(analytics, reportId, exportType, objectType);
    }
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
}
