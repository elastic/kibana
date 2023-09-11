/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { AssetManagerConfig } from '../../types';

export interface InjectedValues {
  sourceIndices: AssetManagerConfig['sourceIndices'];
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMDataAccessConfig['indices']>;
}

export type OptionsWithInjectedValues<T extends object> = T & InjectedValues;

export interface AccessorOptions {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}
