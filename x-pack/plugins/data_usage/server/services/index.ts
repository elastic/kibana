/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppContextService } from './app_context';
import { AutoOpsAPIService } from './autoops_api';
import type { DataUsageContext } from '../types';
import { MetricTypes } from '../../common/rest_types';

export class DataUsageService {
  private appContextService: AppContextService;
  private autoOpsAPIService: AutoOpsAPIService;

  constructor(dataUsageContext: DataUsageContext) {
    this.appContextService = new AppContextService(dataUsageContext);
    this.autoOpsAPIService = new AutoOpsAPIService(this.appContextService);
  }

  getLogger(routeName: string) {
    return this.appContextService.getLogger().get(routeName);
  }
  async getMetrics({
    from,
    to,
    metricTypes,
    dataStreams,
  }: {
    from: string;
    to: string;
    metricTypes: MetricTypes[];
    dataStreams: string[];
  }) {
    const response = await this.autoOpsAPIService.autoOpsUsageMetricsAPI({
      from,
      to,
      metricTypes,
      dataStreams,
    });
    return response.data;
  }
}
