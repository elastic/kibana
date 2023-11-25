/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { MetricsDataClient } from '@kbn/metrics-data-access-plugin/server';
import { AssetManagerConfig } from '../../common/config';

export type GetApmIndicesMethod = (
  soClient: SavedObjectsClientContract
) => Promise<APMDataAccessConfig['indices']>;
export interface AssetClientDependencies {
  elasticsearchClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface AssetClientBaseOptions {
  sourceIndices: AssetManagerConfig['sourceIndices'];
  getApmIndices: GetApmIndicesMethod;
  metricsClient: MetricsDataClient;
}

export type AssetClientOptionsWithInjectedValues<T extends object> = T & AssetClientBaseOptions;
