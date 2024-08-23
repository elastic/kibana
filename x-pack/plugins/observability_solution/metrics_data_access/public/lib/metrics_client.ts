/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  MetricsExplorerRequestBody,
  MetricsExplorerResponse,
} from '../../common/http_api/metrics_explorer';

export class MetricsDataClient {
  constructor(private readonly http: HttpStart) {}

  async metricsExplorer(body: MetricsExplorerRequestBody) {
    return this.http.post<MetricsExplorerResponse>('/api/infra/metrics_explorer', {
      body: JSON.stringify(body),
    });
  }

  async metricsIndices() {
    return this.http.get<{ metricIndices: string; metricIndicesExist: boolean }>(
      '/api/metrics/indices'
    );
  }
}
