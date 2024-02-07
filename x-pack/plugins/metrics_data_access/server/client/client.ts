/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  DefaultMetricIndicesHandler,
  GetMetricIndicesOptions,
  UpdateMetricIndicesOptions,
} from '../types';
import {
  MetricsDataSavedObject,
  metricsDataSourceSavedObjectName,
} from '../saved_objects/metrics_data_source';

export const DEFAULT_METRIC_INDICES = 'metrics-*,metricbeat-*';

export class MetricsDataClient {
  private readonly defaultSavedObjectId = 'default';
  private getDefaultMetricIndices: DefaultMetricIndicesHandler = null;

  async getMetricIndices(options: GetMetricIndicesOptions): Promise<string> {
    const metricIndices = await options.savedObjectsClient
      .get<MetricsDataSavedObject>(metricsDataSourceSavedObjectName, this.defaultSavedObjectId)
      .then(({ attributes }) => attributes.metricIndices)
      .catch((err) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          return this.getDefaultMetricIndices?.(options) ?? DEFAULT_METRIC_INDICES;
        }

        throw err;
      });
    return metricIndices;
  }

  async updateMetricIndices(options: UpdateMetricIndicesOptions) {
    const object = await options.savedObjectsClient.create(
      metricsDataSourceSavedObjectName,
      {
        metricIndices: options.metricIndices,
      },
      { id: this.defaultSavedObjectId, overwrite: true }
    );
    return object;
  }

  setDefaultMetricIndicesHandler(handler: DefaultMetricIndicesHandler) {
    this.getDefaultMetricIndices = handler;
  }
}
