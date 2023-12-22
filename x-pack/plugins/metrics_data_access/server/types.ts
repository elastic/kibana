/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';

import { MetricsDataClient } from './client';

export interface MetricsDataPluginSetup {
  client: MetricsDataClient;
}

export interface MetricsDataPluginStartDeps {
  data: DataPluginStart;
}

export interface GetMetricIndicesOptions {
  savedObjectsClient: SavedObjectsClientContract;
}

export type UpdateMetricIndicesOptions = GetMetricIndicesOptions & {
  metricIndices: string;
};

export type DefaultMetricIndicesHandler =
  | ((options: GetMetricIndicesOptions) => Promise<string>)
  | null;
