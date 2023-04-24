/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type {
  CreateMetricsExplorerViewAttributesRequestPayload,
  MetricsExplorerViewRequestQuery,
  UpdateMetricsExplorerViewAttributesRequestPayload,
} from '../../../common/http_api/latest';
import type { MetricsExplorerView } from '../../../common/metrics_explorer_views';
import type { InfraSources } from '../../lib/sources';

export interface MetricsExplorerViewsServiceStartDeps {
  infraSources: InfraSources;
  savedObjects: SavedObjectsServiceStart;
}

export type MetricsExplorerViewsServiceSetup = void;

export interface MetricsExplorerViewsServiceStart {
  getClient(savedObjectsClient: SavedObjectsClientContract): IMetricsExplorerViewsClient;
  getScopedClient(request: KibanaRequest): IMetricsExplorerViewsClient;
}

export interface IMetricsExplorerViewsClient {
  delete(metricsExplorerViewId: string): Promise<{}>;
  find(query: MetricsExplorerViewRequestQuery): Promise<MetricsExplorerView[]>;
  get(
    metricsExplorerViewId: string,
    query: MetricsExplorerViewRequestQuery
  ): Promise<MetricsExplorerView>;
  create(
    metricsExplorerViewAttributes: CreateMetricsExplorerViewAttributesRequestPayload
  ): Promise<MetricsExplorerView>;
  update(
    metricsExplorerViewId: string,
    metricsExplorerViewAttributes: UpdateMetricsExplorerViewAttributesRequestPayload,
    query: MetricsExplorerViewRequestQuery
  ): Promise<MetricsExplorerView>;
}
