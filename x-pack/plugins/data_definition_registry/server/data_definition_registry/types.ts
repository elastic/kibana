/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { ValuesType } from 'utility-types';
import { ToolSchema, FromToolSchema } from '@kbn/inference-common';

interface DataDefinitionBase {
  id: string;
}

interface MetricBase {
  id: string;
}

interface MetricDefinition extends MetricBase {
  label: string;
  schema: ToolSchema;
}

interface MetricInput extends MetricBase {
  input: Record<string, any>;
}

export interface DataScope {
  index: string | string[];
  query: QueryDslQueryContainer;
}

interface GetDataScopeOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
}

interface GetMetricDefinitionOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
}

interface GetTimeseriesOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
  bucketSize: number;
}

interface Timeseries {
  id: string;
  label: string;
  values: Array<{ x: number; y: number | null }>;
  metricId: string;
}

type GetStaticDataScopeResult = DataScope[];
type GetTimeseriesResult = Timeseries[];

export type GetMetricDefinitionResult = Record<string, Omit<MetricDefinition, 'id'>>;

interface GetTimeseriesOptions {
  start: number;
  end: number;
  query: QueryDslQueryContainer;
  metrics: MetricInput[];
}

type GetTimeseriesOptionsOf<TMetricDefinitionResult extends GetMetricDefinitionResult> = Omit<
  GetTimeseriesOptions,
  'metrics'
> & {
  metrics: Array<
    ValuesType<{
      [TKey in keyof TMetricDefinitionResult]: Omit<MetricInput, 'input'> & {
        input: FromToolSchema<TMetricDefinitionResult[TKey]['schema']>;
      };
    }>
  >;
};

type WithScoped<TBaseOptions extends Record<string, any>> = TBaseOptions & {
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
};

export interface StaticDataDefinition extends DataDefinitionBase {
  getScopes: (options: WithScoped<GetDataScopeOptions>) => Promise<GetStaticDataScopeResult>;
  getMetrics?: (
    options: WithScoped<GetMetricDefinitionOptions>
  ) => Promise<GetMetricDefinitionResult>;
  getTimeseries?: (options: WithScoped<GetTimeseriesOptions>) => Promise<GetTimeseriesResult>;
}

export type DataDefinition = DynamicDataDefinition | StaticDataDefinition;

export interface DynamicDataSource {
  type: string;
  name?: string;
  instance: {
    id: string;
  };
  properties: Record<string, any>;
}

interface GetSourceOptions {
  query: QueryDslQueryContainer;
}

export type ClientGetMetricDefinitionResult = GetMetricDefinitionResult &
  Record<string, { definitionId: string }>;

type GetDynamicDataScopeResult = Array<DataScope & { sources: DynamicDataSource[] }>;
type GetDynamicMetricDefinitionResult = GetMetricDefinitionResult;

export interface DynamicDataDefinition extends DataDefinitionBase {
  id: string;
  source: {
    type: string;
    name?: string;
  };
  getSources: (options: WithScoped<GetSourceOptions>) => Promise<DynamicDataSource[]>;
  getScopes: (
    sources: DynamicDataSource[],
    options: WithScoped<GetDataScopeOptions>
  ) => GetDynamicDataScopeResult;
  getMetrics?: (
    sources: DynamicDataSource[],
    options: WithScoped<GetMetricDefinitionOptions>
  ) => GetDynamicMetricDefinitionResult;
  getTimeseries?: (options: WithScoped<GetTimeseriesOptions>) => Promise<GetTimeseriesResult>;
}

export interface DataDefinitionRegistry {
  registerStaticDataDefinition(
    metadata: {
      id: string;
    },
    getScopeCallback: StaticDataDefinition['getScopes']
  ): void;
  registerStaticDataDefinition<TMetricDefinitionResult extends GetMetricDefinitionResult>(
    metadata: {
      id: string;
    },
    getScopes: StaticDataDefinition['getScopes'],
    getMetrics: (options: GetMetricDefinitionOptions) => Promise<TMetricDefinitionResult>,
    getTimeseries: (
      options: GetTimeseriesOptionsOf<TMetricDefinitionResult>
    ) => Promise<GetTimeseriesResult>
  ): void;
  registerDynamicDataDefinition<TSource extends DynamicDataSource>(
    metadata: {
      id: string;
      source: {
        type: string;
        name?: string;
      };
    },
    getSources: (options: GetSourceOptions) => Promise<TSource[]>,
    getScopes: (sources: TSource[], options: GetDataScopeOptions) => GetDynamicDataScopeResult
  ): void;
  registerDynamicDataDefinition<
    TSource extends DynamicDataSource,
    TMetricDefinitionResult extends GetMetricDefinitionResult
  >(
    metadata: {
      id: string;
      source: {
        type: string;
        name?: string;
      };
    },
    getSources: (options: GetSourceOptions) => Promise<TSource[]>,
    getScopes: (sources: TSource[], options: GetDataScopeOptions) => GetDynamicDataScopeResult,
    getMetrics: (
      sources: TSource[],
      options: GetMetricDefinitionOptions
    ) => TMetricDefinitionResult,
    getTimeseries: (
      options: GetTimeseriesOptionsOf<TMetricDefinitionResult>
    ) => Promise<GetTimeseriesResult>
  ): void;
  getClientWithRequest(request: KibanaRequest): Promise<DataDefinitionRegistryClient>;
}

export type GetDataScopeResult = Array<
  ValuesType<GetStaticDataScopeResult> | ValuesType<GetDynamicDataScopeResult>
>;

export interface DataDefinitionRegistryClient {
  getScopes: (
    sources: DynamicDataSource[],
    options: GetDataScopeOptions
  ) => Promise<GetDataScopeResult>;
  getMetrics: (
    sources: DynamicDataSource[],
    options: GetMetricDefinitionOptions
  ) => Promise<ClientGetMetricDefinitionResult>;
  getTimeseries: (
    options: Omit<GetTimeseriesOptions, 'metrics'> & {
      metrics: Array<MetricInput & { definitionId: string }>;
    }
  ) => Promise<GetTimeseriesResult>;
}
