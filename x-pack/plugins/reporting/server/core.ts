/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from '@hapi/hapi';
import * as Rx from 'rxjs';
import { first, map, take } from 'rxjs/operators';
import {
  BasePath,
  ElasticsearchServiceSetup,
  IRouter,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from '../../../../src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { DEFAULT_SPACE_ID } from '../../spaces/common/constants';
import { SpacesPluginSetup } from '../../spaces/server';
import { ReportingConfig } from './';
import { HeadlessChromiumDriverFactory } from './browsers/chromium/driver_factory';
import { checkLicense, getExportTypesRegistry, LevelLogger } from './lib';
import { ESQueueInstance } from './lib/create_queue';
import { screenshotsObservableFactory, ScreenshotsObservableFn } from './lib/screenshots';
import { ReportingStore } from './lib/store';

export interface ReportingInternalSetup {
  basePath: Pick<BasePath, 'set'>;
  router: IRouter;
  features: FeaturesPluginSetup;
  elasticsearch: ElasticsearchServiceSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
}

export interface ReportingInternalStart {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  esqueue: ESQueueInstance;
  store: ReportingStore;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export class ReportingCore {
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<boolean>(); // observe async background setupDeps and config each are done
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>(); // observe async background startDeps
  private exportTypesRegistry = getExportTypesRegistry();
  private config?: ReportingConfig;

  constructor(private logger: LevelLogger) {}

  /*
   * Register setupDeps
   */
  public pluginSetup(setupDeps: ReportingInternalSetup) {
    this.pluginSetup$.next(true); // trigger the observer
    this.pluginSetupDeps = setupDeps; // cache
  }

  /*
   * Register startDeps
   */
  public pluginStart(startDeps: ReportingInternalStart) {
    this.pluginStart$.next(startDeps); // trigger the observer
    this.pluginStartDeps = startDeps; // cache
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
   * Registers reporting as an Elasticsearch feature for the purpose of toggling visibility based on roles.
   */
  public registerFeature() {
    const config = this.getConfig();
    const allowedRoles = ['superuser', ...(config.get('roles')?.allow ?? [])];
    this.getPluginSetupDeps().features.registerElasticsearchFeature({
      id: 'reporting',
      catalogue: ['reporting'],
      management: {
        insightsAndAlerting: ['reporting'],
      },
      privileges: allowedRoles.map((role) => ({
        requiredClusterPrivileges: [],
        requiredRoles: [role],
        ui: [],
      })),
    });
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

  public async getEsqueue() {
    return (await this.getPluginStartDeps()).esqueue;
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

  public async getScreenshotsObservable(): Promise<ScreenshotsObservableFn> {
    const config = this.getConfig();
    const { browserDriverFactory } = await this.getPluginStartDeps();
    return screenshotsObservableFactory(config.get('capture'), browserDriverFactory);
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

  public getElasticsearchService() {
    return this.getPluginSetupDeps().elasticsearch;
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
}
