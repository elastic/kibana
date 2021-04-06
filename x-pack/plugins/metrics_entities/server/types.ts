/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient, IContextProvider, RequestHandlerContext } from 'kibana/server';

import { MetricsEntitiesClient } from './services/metrics_entities_client';

export type GetMetricsEntitiesClientType = (esClient: ElasticsearchClient) => MetricsEntitiesClient;

export interface MetricsEntitiesPluginSetup {
  getMetricsEntitiesClient: GetMetricsEntitiesClientType;
}

export type MetricsEntitiesPluginStart = void;

export type ContextProvider = IContextProvider<
  MetricsEntitiesRequestHandlerContext,
  'metricsEntities'
>;

export interface MetricsEntitiesApiRequestHandlerContext {
  getMetricsEntitiesClient: () => MetricsEntitiesClient;
}

export interface MetricsEntitiesRequestHandlerContext extends RequestHandlerContext {
  metricsEntities?: MetricsEntitiesApiRequestHandlerContext;
}

/**
 * @internal
 */
export type ContextProviderReturn = Promise<MetricsEntitiesApiRequestHandlerContext>;
