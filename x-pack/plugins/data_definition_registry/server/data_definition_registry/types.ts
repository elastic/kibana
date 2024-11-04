/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { KibanaRequest } from '@kbn/core/server';

interface DataDefinitionSourceBase {
  type: string;
  name?: string;
  instance: {
    id: string;
  };
}

interface DataDefinitionSourceRule extends DataDefinitionSourceBase {
  type: 'rule';
  name: string;
}

interface DataDefinitionSourceVisualization extends DataDefinitionSourceBase {
  type: 'visualization';
  name: string;
}

interface DataDefinitionSourceSlo extends DataDefinitionSourceBase {
  type: 'slo';
}

export type DataDefinitionSource =
  | DataDefinitionSourceRule
  | DataDefinitionSourceSlo
  | DataDefinitionSourceVisualization;

export interface DataDefinitionScope {
  index: string | string[];
  query: QueryDslQueryContainer;
}

export interface DataDefinitionMetric {
  id: string;
  definitionId: string;
  label: string;
}

interface DataDefinitionMetricTimeseries {
  id: string;
  label: string;
  values: Array<{ x: number; y: number | null }>;
}

interface DataDefinitionMetricWithTimeseries {
  metric: DataDefinitionMetric;
  timeseries: DataDefinitionMetricTimeseries[];
}

export interface GetDataScopeOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
}

interface GetMetricsOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
}

interface GetTimeseriesOptions {
  metrics: Array<{ id: string; definitionId: string }>;
  query: QueryDslQueryContainer;
  start: number;
  end: number;
  bucketSize: number;
  request: KibanaRequest;
}

type WithScopedRequest<TBaseOptions extends Record<string, any>> = {
  request: KibanaRequest;
} & TBaseOptions;

export interface StaticDataDefinition {
  id: string;
  getDataScope(options: WithScopedRequest<GetDataScopeOptions>): Promise<DataDefinitionScope>;
  getMetrics(options: WithScopedRequest<GetMetricsOptions>): Promise<DataDefinitionMetric[]>;
  getTimeseries(options: GetTimeseriesOptions): Promise<DataDefinitionMetricWithTimeseries[]>;
}

export type DataDefinition = StaticDataDefinition | DynamicDataDefinition;

type DynamicDefinitionCallback<TBaseOptions extends Record<string, any>, TReturn> = (
  options: TBaseOptions & { source: DataDefinitionSource }
) => TReturn;

export interface DynamicDataDefinition {
  id: string;
  source: Omit<DataDefinitionSource, 'instance'>;
  getDataScope: DynamicDefinitionCallback<GetDataScopeOptions, DataDefinitionScope>;
  getMetrics: DynamicDefinitionCallback<GetMetricsOptions, DataDefinitionMetric[]>;
  getTimeseries: DynamicDefinitionCallback<
    GetTimeseriesOptions,
    DataDefinitionMetricWithTimeseries[]
  >;
}

export interface DataDefinitionRegistry {
  registerDynamicDefinition(options: DynamicDataDefinition): void;
  registerDefinition(definition: StaticDataDefinition): void;
  getClientWithRequest(request: KibanaRequest): DataDefinitionRegistryClient;
}

export interface DataDefinitionRegistryClient {
  getDataScopes(
    sources: DataDefinitionSource[],
    options: GetDataScopeOptions
  ): Promise<Array<{ scope: DataDefinitionScope; source?: DataDefinitionSource }>>;
  getMetrics(
    sources: DataDefinitionSource[],
    options: GetMetricsOptions
  ): Promise<
    Array<{
      metrics: DataDefinitionMetric[];
      scope: DataDefinitionScope;
      source?: DataDefinitionSource;
    }>
  >;
  getTimeseries(
    sources: DataDefinitionSource[],
    options: GetTimeseriesOptions
  ): Promise<DataDefinitionMetricWithTimeseries[]>;
}
