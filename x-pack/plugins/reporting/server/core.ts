/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, map, mapTo } from 'rxjs/operators';
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
import { screenshotsObservableFactory } from './export_types/common/lib/screenshots';
import { checkLicense, getExportTypesRegistry } from './lib';
import { ESQueueInstance } from './lib/create_queue';
import { EnqueueJobFn } from './lib/enqueue_job';

export interface ReportingInternalSetup {
  elasticsearch: ElasticsearchServiceSetup;
  licensing: LicensingPluginSetup;
  basePath: BasePath['get'];
  router: IRouter;
  security?: SecurityPluginSetup;
}

interface ReportingInternalStart {
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export class ReportingCore {
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private browserDriverFactory?: HeadlessChromiumDriverFactory;
  private readonly pluginSetup$ = new Rx.ReplaySubject<ReportingInternalSetup>();
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>();
  private exportTypesRegistry = getExportTypesRegistry();

  constructor(private config: ReportingConfig) {}

  public pluginSetup(reportingSetupDeps: ReportingInternalSetup) {
    this.pluginSetupDeps = reportingSetupDeps;
    this.pluginSetup$.next(reportingSetupDeps);
  }

  public pluginStart(reportingStartDeps: ReportingInternalStart) {
    this.pluginStart$.next(reportingStartDeps);
  }

  public pluginHasStarted(): Promise<boolean> {
    return this.pluginStart$.pipe(first(), mapTo(true)).toPromise();
  }

  public setBrowserDriverFactory(browserDriverFactory: HeadlessChromiumDriverFactory) {
    this.browserDriverFactory = browserDriverFactory;
  }

  /*
   * Internal module dependencies
   */
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

  public getConfig(): ReportingConfig {
    return this.config;
  }

  public getScreenshotsObservable(): ScreenshotsObservableFn {
    const { browserDriverFactory } = this;
    if (!browserDriverFactory) {
      throw new Error(`"browserDriverFactory" dependency hasn't initialized yet`);
    }
    return screenshotsObservableFactory(this.config.get('capture'), browserDriverFactory);
  }

  public getPluginSetupDeps() {
    if (!this.pluginSetupDeps) {
      throw new Error(`"pluginSetupDeps" dependencies haven't initialized yet`);
    }
    return this.pluginSetupDeps;
  }

  /*
   * Outside dependencies
   */

  private async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }
    return await this.pluginStart$.pipe(first()).toPromise();
  }

  public async getElasticsearchService() {
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
