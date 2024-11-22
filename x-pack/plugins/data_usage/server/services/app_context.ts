/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { LoggerFactory } from '@kbn/core/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { DataUsageConfigType } from '../config';
import type { DataUsageContext } from '../types';

export class AppContextService {
  private config$?: Observable<DataUsageConfigType>;
  private configSubject$?: BehaviorSubject<DataUsageConfigType>;
  private kibanaVersion: DataUsageContext['kibanaVersion'] = kibanaPackageJson.version;
  private kibanaBranch: DataUsageContext['kibanaBranch'] = kibanaPackageJson.branch;
  private kibanaInstanceId: DataUsageContext['kibanaInstanceId'] = '';
  private cloud?: CloudSetup;
  private logFactory?: LoggerFactory;

  public start(appContext: DataUsageContext) {
    this.cloud = appContext.cloud;
    this.logFactory = appContext.logFactory;
    this.kibanaVersion = appContext.kibanaVersion;
    this.kibanaBranch = appContext.kibanaBranch;
    this.kibanaInstanceId = appContext.kibanaInstanceId;
    if (appContext.config$) {
      this.config$ = appContext.config$;
      const initialValue = appContext.configInitialValue;
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {}

  public getCloud() {
    return this.cloud;
  }

  public getLogger() {
    if (!this.logFactory) {
      throw new Error('Logger not set.');
    }
    return this.logFactory;
  }

  public getConfig() {
    return this.configSubject$?.value;
  }

  public getConfig$() {
    return this.config$;
  }

  public getKibanaVersion() {
    return this.kibanaVersion;
  }

  public getKibanaBranch() {
    return this.kibanaBranch;
  }

  public getKibanaInstanceId() {
    return this.kibanaInstanceId;
  }
}

export const appContextService = new AppContextService();
