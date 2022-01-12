/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from 'kibana/public';
import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import type { MlDependencies } from '../application/app';

export const ML_ANOMALY = 'ML_ANOMALIES';

export class AnomalySourceFactory {
  public readonly type = ML_ANOMALY;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>,
    private canGetJobs: any
  ) {
    this.canGetJobs = canGetJobs;
  }

  private async getServices(): Promise<any> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    const { mlApiServicesProvider } = await import('../application/services/ml_api_service');
    // const { resultsApiProvider } = await import('../application/services/ml_api_service/results');

    const httpService = new HttpService(coreStart.http);
    // const mlApiService = mlApiServicesProvider(httpService);
    const mlResultsService = mlApiServicesProvider(httpService).results;
    // const mlResultsService = resultsApiProvider(httpService);

    return [coreStart, pluginsStart as MlDependencies, { mlResultsService }];
  }

  public async create(): Promise<any> {
    const services = await this.getServices();
    const { AnomalySource } = await import('./anomaly_source');
    AnomalySource.services = services;
    AnomalySource.canGetJobs = this.canGetJobs;
    return AnomalySource;
  }
}
