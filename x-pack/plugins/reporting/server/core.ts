/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
} from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { ScreenshotsObservableFn } from '../server/types';
import { ReportingConfig } from './';
import { HeadlessChromiumDriverFactory } from './browsers/chromium/driver_factory';
import { screenshotsObservableFactory } from './lib/screenshots';
import { checkLicense, getExportTypesRegistry } from './lib';
import { ESQueueInstance } from './lib/create_queue';
import { EnqueueJobFn } from './lib/enqueue_job';
import { ReportingStore } from './lib/store';

export interface ReportingInternalSetup {
  elasticsearch: ElasticsearchServiceSetup;
  licensing: LicensingPluginSetup;
  basePath: BasePath['get'];
  router: IRouter;
  security?: SecurityPluginSetup;
}

export interface ReportingInternalStart {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  enqueueJob: EnqueueJobFn;
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

  constructor() {}

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
  private async getPluginStartDeps() {
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

  public async getEnqueueJob() {
    return (await this.getPluginStartDeps()).enqueueJob;
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

  public async getSavedObjectsClient(fakeRequest: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(fakeRequest) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }
}
