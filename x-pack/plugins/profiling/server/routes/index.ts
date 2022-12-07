/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ProfilingPluginSetupDeps,
  ProfilingPluginStartDeps,
  ProfilingRequestHandlerContext,
} from '../types';
import { ProfilingESClient } from '../utils/create_profiling_es_client';

import { registerCacheExecutablesRoute, registerCacheStackFramesRoute } from './cache';

import { registerFlameChartSearchRoute } from './flamechart';
import { registerTopNFunctionsSearchRoute } from './functions';

import {
  registerTraceEventsTopNContainersSearchRoute,
  registerTraceEventsTopNDeploymentsSearchRoute,
  registerTraceEventsTopNHostsSearchRoute,
  registerTraceEventsTopNStackTracesSearchRoute,
  registerTraceEventsTopNThreadsSearchRoute,
} from './topn';

export interface RouteRegisterParameters {
  router: IRouter<ProfilingRequestHandlerContext>;
  logger: Logger;
  dependencies: {
    start: ProfilingPluginStartDeps;
    setup: ProfilingPluginSetupDeps;
  };
  services: {
    createProfilingEsClient: (params: {
      request: KibanaRequest;
      esClient: ElasticsearchClient;
    }) => ProfilingESClient;
  };
}

export function registerRoutes(params: RouteRegisterParameters) {
  registerCacheExecutablesRoute(params);
  registerCacheStackFramesRoute(params);
  registerFlameChartSearchRoute(params);
  registerTopNFunctionsSearchRoute(params);
  registerTraceEventsTopNContainersSearchRoute(params);
  registerTraceEventsTopNDeploymentsSearchRoute(params);
  registerTraceEventsTopNHostsSearchRoute(params);
  registerTraceEventsTopNStackTracesSearchRoute(params);
  registerTraceEventsTopNThreadsSearchRoute(params);
}
