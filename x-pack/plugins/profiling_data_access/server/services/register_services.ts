/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { createFetchFlamechart } from './fetch_flamechart';
import { ProfilingESClient } from '../utils/create_profiling_es_client';

export interface RegisterServicesParams {
  createProfilingEsClient: (params: {
    esClient: ElasticsearchClient;
    useDefaultAuth?: boolean;
  }) => ProfilingESClient;
}

export function registerServices(params: RegisterServicesParams) {
  return { fetchFlamechartData: createFetchFlamechart(params) };
}
