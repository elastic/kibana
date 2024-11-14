/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidationError } from '@kbn/config-schema';
import { MetricTypes } from '../../common/rest_types';
import { AutoOpsError } from './errors';
import { appContextService } from './app_context';
import { autoOpsAPIService } from './autoops_api';

export class DataUsageService {
  getLogger(routeName: string) {
    return appContextService.getLogger().get(routeName);
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
    try {
      const response = await autoOpsAPIService.autoOpsUsageMetricsAPI({
        from,
        to,
        metricTypes,
        dataStreams,
      });
      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new AutoOpsError(error.message);
      }

      throw error;
    }
  }
}
