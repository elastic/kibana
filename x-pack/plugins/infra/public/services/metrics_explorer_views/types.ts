/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  FindMetricsExplorerViewResponsePayload,
  CreateMetricsExplorerViewResponsePayload,
  UpdateMetricsExplorerViewResponsePayload,
  GetMetricsExplorerViewResponsePayload,
} from '../../../common/http_api';
import { MetricsExplorerViewAttributes } from '../../../common/metrics_explorer_views';

export type MetricsExplorerViewsServiceSetup = void;

export interface MetricsExplorerViewsServiceStart {
  client: IMetricsExplorerViewsClient;
}

export interface MetricsExplorerViewsServiceStartDeps {
  http: HttpStart;
}

export interface IMetricsExplorerViewsClient {
  findMetricsExplorerViews(): Promise<FindMetricsExplorerViewResponsePayload['data']>;
  getMetricsExplorerView(
    metricsExplorerViewId: string
  ): Promise<GetMetricsExplorerViewResponsePayload>;
  createMetricsExplorerView(
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<CreateMetricsExplorerViewResponsePayload>;
  updateMetricsExplorerView(
    metricsExplorerViewId: string,
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<UpdateMetricsExplorerViewResponsePayload>;
  deleteMetricsExplorerView(metricsExplorerViewId: string): Promise<null>;
}
