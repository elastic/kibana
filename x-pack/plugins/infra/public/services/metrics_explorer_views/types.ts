/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  MetricsExplorerView,
  MetricsExplorerViewAttributes,
} from '../../../common/metrics_explorer_views';

export type MetricsExplorerViewsServiceSetup = void;

export interface MetricsExplorerViewsServiceStart {
  client: IMetricsExplorerViewsClient;
}

export interface MetricsExplorerViewsServiceStartDeps {
  http: HttpStart;
}

export interface IMetricsExplorerViewsClient {
  findMetricsExplorerViews(): Promise<MetricsExplorerView[]>;
  getMetricsExplorerView(metricsExplorerViewId: string): Promise<MetricsExplorerView>;
  createMetricsExplorerView(
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<MetricsExplorerView>;
  updateMetricsExplorerView(
    metricsExplorerViewId: string,
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<MetricsExplorerView>;
  deleteMetricsExplorerView(metricsExplorerViewId: string): Promise<null>;
}
