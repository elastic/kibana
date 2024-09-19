/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
