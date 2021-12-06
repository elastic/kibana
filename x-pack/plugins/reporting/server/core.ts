/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Hapi from '@hapi/hapi';
import * as Rx from 'rxjs';
import { filter, first, map, switchMap, take } from 'rxjs/operators';
import type { ScreenshottingStart, ScreenshotResult } from '../../screenshotting/server';
import {
  BasePath,
  IClusterClient,
  KibanaRequest,
  PackageInfo,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  ServiceStatusLevels,
  StatusServiceSetup,
  UiSettingsServiceStart,
} from '../../../../src/core/server';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { DEFAULT_SPACE_ID } from '../../spaces/common/constants';
import { SpacesPluginSetup } from '../../spaces/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../common/constants';
import { durationToNumber } from '../common/schema_utils';
import { ReportingConfig, ReportingSetup } from './';
import { ReportingConfigType } from './config';
import { checkLicense, getExportTypesRegistry, LevelLogger } from './lib';
import { ReportingStore } from './lib/store';
import { ExecuteReportTask, MonitorReportsTask, ReportTaskParams } from './lib/tasks';
import { ReportingPluginRouter, ScreenshotOptions } from './types';

export interface ReportingInternalSetup {
  basePath: Pick<BasePath, 'set'>;
  router: ReportingPluginRouter;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager: TaskManagerSetupContract;
  logger: LevelLogger;
  status: StatusServiceSetup;
}

export interface ReportingInternalStart {
  store: ReportingStore;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  data: DataPluginStart;
  taskManager: TaskManagerStartContract;
  logger: LevelLogger;
  screenshotting: ScreenshottingStart;
}

export class ReportingCore {
  private packageInfo: PackageInfo;
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<boolean>(); // observe async background setupDeps and config each are done
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>(); // observe async background startDeps
  private deprecatedAllowedRoles: string[] | false = false; // DEPRECATED. If `false`, the deprecated features have been disableed
  private exportTypesRegistry = getExportTypesRegistry();
  private executeTask: ExecuteReportTask;
  private monitorTask: MonitorReportsTask;
  private config?: ReportingConfig; // final config, includes dynamic values based on OS type
  private executing: Set<string>;

  public getContract: () => ReportingSetup;

  constructor(private logger: LevelLogger, context: PluginInitializerContext<ReportingConfigType>) {
    this.packageInfo = context.env.packageInfo;
    const syncConfig = context.config.get<ReportingConfigType>();
    this.deprecatedAllowedRoles = syncConfig.roles.enabled ? syncConfig.roles.allow : false;
    this.executeTask = new ExecuteReportTask(this, syncConfig, this.logger);
    this.monitorTask = new MonitorReportsTask(this, syncConfig, this.logger);

    this.getContract = () => ({
      usesUiCapabilities: () => syncConfig.roles.enabled === false,
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

    await this.assertKibanaIsAvailable();

    const { taskManager } = startDeps;
    const { executeTask, monitorTask } = this;
    // enable this instance to generate reports and to monitor for pending reports
    await Promise.all([executeTask.init(taskManager), monitorTask.init(taskManager)]);
  }

  private async assertKibanaIsAvailable(): Promise<void> {
    const { status } = this.getPluginSetupDeps();

    await status.overall$
      .pipe(
        filter((current) => current.level === ServiceStatusLevels.available),
        first()
      )
      .toPromise();
  }

  /*
   * Blocks the caller until setup is done
   */
  public async pluginSetsUp(): Promise<boolean> {
    // use deps and config as a cached resolver
    if (this.pluginSetupDeps && this.config) {
      return true;
    }
    return await this.pluginSetup$.pipe(take(2)).toPromise(); // once for pluginSetupDeps (sync) and twice for config (async)
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
  public setConfig(config: ReportingConfig) {
    this.config = config;
    this.pluginSetup$.next(true);
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
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfig {
    if (!this.config) {
      throw new Error('Config is not yet initialized');
    }
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
   * Gives async access to the startDeps
   */
  public async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }

    return await this.pluginStart$.pipe(first()).toPromise();
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
    const { licensing } = this.getPluginSetupDeps();
    return await licensing.license$
      .pipe(
        map((license) => checkLicense(this.getExportTypesRegistry(), license)),
        first()
      )
      .toPromise();
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

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
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

  public getFakeRequest(baseRequest: object, spaceId: string | undefined, logger = this.logger) {
    const fakeRequest = KibanaRequest.from({
      path: '/',
      route: { settings: {} },
      url: { href: '/' },
      raw: { req: { url: '/' } },
      ...baseRequest,
    } as Hapi.Request);

    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.getPluginSetupDeps().basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }

    return fakeRequest;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    const spaceId = this.getSpaceId(request, logger);
    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return await this.getUiSettingsServiceFactory(savedObjectsClient);
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

  public getScreenshots(options: ScreenshotOptions): Rx.Observable<ScreenshotResult> {
    return Rx.defer(() => this.getPluginStartDeps()).pipe(
      switchMap(({ screenshotting }) => {
        const config = this.getConfig();
        return screenshotting.getScreenshots({
          ...options,

          timeouts: {
            loadDelay: durationToNumber(config.get('capture', 'loadDelay')),
            openUrl: durationToNumber(config.get('capture', 'timeouts', 'openUrl')),
            waitForElements: durationToNumber(config.get('capture', 'timeouts', 'waitForElements')),
            renderComplete: durationToNumber(config.get('capture', 'timeouts', 'renderComplete')),
          },

          layout: {
            zoom: config.get('capture', 'zoom'),
            ...options.layout,
          },

          urls: options.urls.map((url) =>
            typeof url === 'string'
              ? url
              : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
          ),
        });
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
}
