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

interface MetricDefinition {
  id: string;
  label: string;
  schema: ToolSchema;
  properties: Record<string, any>;
}

interface MetricInput {
  metric: Omit<MetricDefinition, 'schema'>;
  input: Record<string, any>;
}

interface DynamicDataAsset {
  type: string;
  name?: string;
  instance: {
    id: string;
  };
  properties: Record<string, any>;
}

interface DataScope<TAsset extends DynamicDataAsset = DynamicDataAsset> {
  assets: TAsset[];
  index: string | string[];
  query: QueryDslQueryContainer;
}

interface KibanaClientOptions {
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
}

interface TimeRangeOptions {
  start: number;
  end: number;
}

interface QueryOptions {
  index: string | string[];
  query: QueryDslQueryContainer;
}

interface DataStreamOptions {
  dataStreams: {
    all: Set<string>;
    matches: (indexPattern: string) => boolean;
  };
}

type InternalGetDataScopeOptions = TimeRangeOptions & DataStreamOptions & KibanaClientOptions;

type GetDataScopeOptions = TimeRangeOptions & QueryOptions;

type InternalGetMetricDefinitionOptions = TimeRangeOptions &
  DataStreamOptions &
  KibanaClientOptions;

type GetMetricDefinitionOptions = TimeRangeOptions & QueryOptions;

type InternalGetTimeseriesOptions = TimeRangeOptions &
  Omit<QueryOptions, 'index'> & { metrics: MetricInput[] };

type GetTimeseriesOptions = Omit<TimeRangeOptions, 'index'> &
  QueryOptions & {
    metrics: Array<MetricInput & { definitionId: string }>;
  };

interface Timeseries {
  id: string;
  label: string;
  values: Array<{ x: number; y: number | null }>;
  metricId: string;
}

type InternalGetDataScopeResult<TAsset extends DynamicDataAsset = DynamicDataAsset> = Array<
  DataScope<TAsset>
>;

type InternalGetTimeseriesResult = Timeseries[];

type InternalGetMetricDefinitionResult = Partial<{
  [key: string]: Omit<MetricDefinition, 'id'>;
}>;

interface MetricInputOf<
  TMetricId extends string,
  TMetricDefinition extends Omit<MetricDefinition, 'id'>
> {
  id: TMetricId;
  properties: TMetricDefinition['properties'];
  input: FromToolSchema<TMetricDefinition['schema']>;
}

type InternalGetTimeseriesOptionsOf<
  TMetricDefinitionResult extends InternalGetMetricDefinitionResult
> = Omit<InternalGetTimeseriesOptions, 'metrics'> & {
  metrics: Array<
    ValuesType<
      Required<{
        [TKey in keyof TMetricDefinitionResult & string]: MetricInputOf<
          TKey,
          Exclude<TMetricDefinitionResult[TKey], undefined>
        >;
      }>
    >
  >;
};

interface StaticDataDefinition extends DataDefinitionBase {
  getMetricDefinitions: (
    options: InternalGetMetricDefinitionOptions
  ) => Promise<InternalGetMetricDefinitionResult>;
  getTimeseries: (options: InternalGetTimeseriesOptions) => Promise<InternalGetTimeseriesResult>;
}

interface DynamicDataDefinition extends DataDefinitionBase {
  id: string;
  asset: {
    type: string;
    name?: string;
  };
  getScopes: (options: InternalGetDataScopeOptions) => Promise<InternalGetDataScopeResult>;
  getMetricDefinitions?: (
    options: InternalGetMetricDefinitionOptions,
    assets?: DynamicDataAsset[]
  ) => Promise<InternalGetMetricDefinitionResult>;
  getTimeseries?: (options: InternalGetTimeseriesOptions) => Promise<InternalGetTimeseriesResult>;
}

type DataDefinition = DynamicDataDefinition | StaticDataDefinition;

interface DataDefinitionRegistry {
  registerStaticDataDefinition<TMetricDefinitionResult extends InternalGetMetricDefinitionResult>(
    metadata: {
      id: string;
    },
    getMetricDefinitions: (
      options: InternalGetMetricDefinitionOptions
    ) => Promise<TMetricDefinitionResult>,
    getTimeseries: (
      options: InternalGetTimeseriesOptionsOf<TMetricDefinitionResult>
    ) => Promise<InternalGetTimeseriesResult>
  ): void;
  registerDynamicDataDefinition<TAsset extends DynamicDataAsset>(
    metadata: {
      id: string;
      asset: {
        type: string;
        name?: string;
      };
    },
    getScopes: (options: InternalGetDataScopeOptions) => Promise<InternalGetDataScopeResult>
  ): void;
  registerDynamicDataDefinition<
    TAsset extends DynamicDataAsset,
    TMetricDefinitionResult extends InternalGetMetricDefinitionResult
  >(
    metadata: {
      id: string;
      asset: {
        type: string;
        name?: string;
      };
    },
    getScopes: (
      options: InternalGetDataScopeOptions
    ) => Promise<InternalGetDataScopeResult<TAsset>>,
    getMetricDefinitions: (
      options: InternalGetMetricDefinitionOptions,
      assets?: TAsset[]
    ) => Promise<TMetricDefinitionResult>,
    getTimeseries: (
      options: InternalGetTimeseriesOptionsOf<TMetricDefinitionResult>
    ) => Promise<InternalGetTimeseriesResult>
  ): void;
  getClientWithRequest(request: KibanaRequest): Promise<DataDefinitionRegistryClient>;
}

type GetDataScopeResult = Array<DataScope & { definitionId: string }>;

type GetMetricDefinitionResult = {
  [TMetricId in keyof InternalGetMetricDefinitionResult]: InternalGetMetricDefinitionResult[TMetricId] & {
    definitionId: string;
  };
};

type GetTimeseriesResult = Timeseries[];

interface DataDefinitionRegistryClient {
  getScopes: (options: GetDataScopeOptions) => Promise<GetDataScopeResult>;
  getMetricDefinitions: (
    options: GetMetricDefinitionOptions,
    assets?: DynamicDataAsset[]
  ) => Promise<GetMetricDefinitionResult>;
  getTimeseries: (options: GetTimeseriesOptions) => Promise<GetTimeseriesResult>;
}

export type {
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DataScope,
  DynamicDataAsset,
  DynamicDataDefinition,
  GetMetricDefinitionResult,
  GetDataScopeResult,
  StaticDataDefinition,
};
