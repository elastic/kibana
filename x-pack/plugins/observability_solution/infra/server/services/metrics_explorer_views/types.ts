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
  FindMetricsExplorerViewResponsePayload,
  GetMetricsExplorerViewResponsePayload,
  MetricsExplorerViewRequestQuery,
  UpdateMetricsExplorerViewAttributesRequestPayload,
  UpdateMetricsExplorerViewResponsePayload,
} from '../../../common/http_api/latest';
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
  find(
    query: MetricsExplorerViewRequestQuery
  ): Promise<FindMetricsExplorerViewResponsePayload['data']>;
  get(
    metricsExplorerViewId: string,
    query: MetricsExplorerViewRequestQuery
  ): Promise<GetMetricsExplorerViewResponsePayload>;
  update(
    metricsExplorerViewId: string | null,
    metricsExplorerViewAttributes: UpdateMetricsExplorerViewAttributesRequestPayload,
    query: MetricsExplorerViewRequestQuery
  ): Promise<UpdateMetricsExplorerViewResponsePayload>;
}
