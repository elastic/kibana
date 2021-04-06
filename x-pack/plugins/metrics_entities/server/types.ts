/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient, IContextProvider, RequestHandlerContext } from 'kibana/server';

import { MetricsSummaryClient } from './services/metrics_entities_client';

export type GetMetricsSummaryClientType = (esClient: ElasticsearchClient) => MetricsSummaryClient;

export interface MetricsSummaryPluginSetup {
  getMetricsSummaryClient: GetMetricsSummaryClientType;
}

export type MetricsSummaryPluginStart = void;

export type ContextProvider = IContextProvider<
  MetricsSummaryRequestHandlerContext,
  'metricsSummary'
>;

export interface MetricsSummaryApiRequestHandlerContext {
  getMetricsSummaryClient: () => MetricsSummaryClient;
}

export interface MetricsSummaryRequestHandlerContext extends RequestHandlerContext {
  metricsSummary?: MetricsSummaryApiRequestHandlerContext;
}

/**
 * @internal
 */
export type ContextProviderReturn = Promise<MetricsSummaryApiRequestHandlerContext>;
