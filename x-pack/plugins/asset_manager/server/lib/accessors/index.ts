/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AssetManagerConfig } from '../../types';

export interface InjectedValues {
  sourceIndices: AssetManagerConfig['sourceIndices'];
}

export type OptionsWithInjectedValues<T extends object> = T & InjectedValues;

export interface AccessorOptions {
  esClient: ElasticsearchClient;
}
