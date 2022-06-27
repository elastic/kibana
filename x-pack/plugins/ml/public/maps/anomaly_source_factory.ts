/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import type { MlApiServices } from '../application/services/ml_api_service';

export const ML_ANOMALY = 'ML_ANOMALIES';

export class AnomalySourceFactory {
  public readonly type = ML_ANOMALY;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>,
    private canGetJobs: boolean
  ) {
    this.canGetJobs = canGetJobs;
  }

  private async getServices(): Promise<{ mlResultsService: MlApiServices['results'] }> {
    const [coreStart] = await this.getStartServices();
    const { mlApiServicesProvider } = await import('../application/services/ml_api_service');

    const httpService = new HttpService(coreStart.http);
    const mlResultsService = mlApiServicesProvider(httpService).results;

    return { mlResultsService };
  }

  public async create(): Promise<any> {
    const { mlResultsService } = await this.getServices();
    const { AnomalySource } = await import('./anomaly_source');
    AnomalySource.mlResultsService = mlResultsService;
    AnomalySource.canGetJobs = this.canGetJobs;
    return AnomalySource;
  }
}
