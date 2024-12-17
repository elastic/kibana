/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { Observable } from 'rxjs';

interface DataDefinitionBase {
  id: string;
}

interface DynamicDataAsset<TProperties extends Record<string, any> = Record<string, any>> {
  type: string;
  name?: string;
  instance: {
    id: string;
  };
  properties: TProperties;
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
  dataStreams$: Observable<{
    all: Set<string>;
    matches: (indexPattern: string | string[], options?: { includeRemote: boolean }) => boolean;
  }>;
}

type InternalGetQueriesOptions = DataStreamOptions & KibanaClientOptions & QueryOptions;
type InternalGetAssetsOptions = DataStreamOptions & KibanaClientOptions & QueryOptions;

type GetAssetOptions = TimeRangeOptions & QueryOptions;
type GetQueriesOptions = TimeRangeOptions & QueryOptions;

type InternalDynamicGetQueriesOptions<TAsset extends DynamicDataAsset> = DataStreamOptions & {
  assets: TAsset[];
};

interface EsqlQueryTemplate {
  query: string;
  description: string;
}

interface StaticDataDefinition extends DataDefinitionBase {
  getQueries: (options: InternalGetQueriesOptions) => Promise<EsqlQueryTemplate[]>;
}

interface DynamicDataDefinition<TAsset extends DynamicDataAsset = DynamicDataAsset>
  extends DataDefinitionBase {
  getAssets: (options: InternalGetAssetsOptions) => Promise<TAsset[]>;
  getQueries: (options: InternalDynamicGetQueriesOptions<TAsset>) => Promise<EsqlQueryTemplate[]>;
}

type DataDefinition = DynamicDataDefinition | StaticDataDefinition;

interface DataDefinitionRegistry {
  registerStaticDataDefinition: (definition: StaticDataDefinition) => void;
  registerDynamicDataDefinition: <TAsset extends DynamicDataAsset>(
    definition: DynamicDataDefinition<TAsset>
  ) => void;
  getClientWithRequest(request: KibanaRequest): Promise<DataDefinitionRegistryClient>;
}

interface DataDefinitionRegistryClient {
  getAssets: (options: GetAssetOptions) => Promise<DynamicDataAsset[]>;
  getQueries: (options: GetQueriesOptions) => Promise<EsqlQueryTemplate[]>;
}

export type {
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DynamicDataAsset,
  DynamicDataDefinition,
  StaticDataDefinition,
  EsqlQueryTemplate,
};
