/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';

import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { MetricsDataAccessServices } from './services';
import { PLUGIN_ID } from '../common';

export interface MetricsDataAccessPluginSetup {
  services: MetricsDataAccessServices;
}

export interface MetricsDataAccessPluginStartDeps {
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

export type MetricsDataAccessRouterHandlerContext = CustomRequestHandlerContext<{
  [PLUGIN_ID]: { getMetricsIndices: () => Promise<string> };
}>;
