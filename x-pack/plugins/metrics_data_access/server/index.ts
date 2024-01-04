/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';

export type {
  MetricsDataPluginSetup,
  GetMetricIndicesOptions,
  UpdateMetricIndicesOptions,
  DefaultMetricIndicesHandler,
} from './types';

export { metricsDataSourceSavedObjectName } from './saved_objects/metrics_data_source';

export { MetricsDataClient } from './client';
export { MetricsDataClientMock } from './client_mock';

export async function plugin(context: PluginInitializerContext) {
  const { MetricsDataPlugin } = await import('./plugin');
  return new MetricsDataPlugin(context);
}
