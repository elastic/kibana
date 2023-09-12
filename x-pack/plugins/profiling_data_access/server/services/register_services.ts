/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudStart } from '@kbn/cloud-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { createFetchFlamechart } from './fetch_flamechart';

export interface RegisterServicesParams {
  createProfilingEsClient: (params: {
    esClient: ElasticsearchClient;
    useDefaultAuth?: boolean;
  }) => ProfilingESClient;
  deps: {
    fleet: FleetStartContract;
    cloud: CloudStart;
    spaces?: SpacesPluginStart;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return { fetchFlamechartData: createFetchFlamechart(params) };
}
