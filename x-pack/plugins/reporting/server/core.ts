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

export interface ReportingInternalStart {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export class ReportingCore {
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<boolean>(); // for pluginHasSetup
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>(); // for getPluginStartDeps
  private exportTypesRegistry = getExportTypesRegistry();
  private config?: ReportingConfig;

  constructor() {}

  public pluginSetup(reportingSetupDeps: ReportingInternalSetup) {
    this.pluginSetupDeps = reportingSetupDeps;
    this.pluginSetup$.next(true);
  }

  public pluginStart(reportingStartDeps: ReportingInternalStart) {
    this.pluginStart$.next(reportingStartDeps);
  }

  public setConfig(config: ReportingConfig) {
    this.config = config;
    this.pluginSetup$.next(true);
  }

  /*
   * High-level module dependencies
   */

  public getConfig(): ReportingConfig {
    if (!this.config) {
      throw new Error('Config is not yet initialized');
    }
    return this.config;
  }

  public getPluginSetupDeps() {
    if (!this.pluginSetupDeps) {
      throw new Error(`"pluginSetupDeps" dependencies haven't initialized yet`);
    }
    return this.pluginSetupDeps;
  }

  private async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }
    return await this.pluginStart$.pipe(first()).toPromise();
  }

  public async pluginIsSetup(): Promise<boolean> {
    // use deps and config as a cached resolver
    if (this.pluginSetupDeps && this.config) {
      return true;
    }
    return await this.pluginSetup$.pipe(take(2)).toPromise(); // once for pluginSetupDeps (sync) and twice for config (async)
  }

  public async pluginIsStarted(): Promise<boolean> {
    return await this.getPluginStartDeps().then(() => true);
  }

  /*
   * Downstream dependencies
   */

  public getExportTypesRegistry() {
    return this.exportTypesRegistry;
  }

  public async getSavedObjectsClient(fakeRequest: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(fakeRequest) as SavedObjectsClientContract;
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
}
