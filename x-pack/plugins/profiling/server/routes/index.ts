/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { registerFlameChartElasticSearchRoute } from './flamechart';

import {
  registerTraceEventsTopNContainersSearchRoute,
  registerTraceEventsTopNDeploymentsSearchRoute,
  registerTraceEventsTopNHostsSearchRoute,
  registerTraceEventsTopNStackTracesSearchRoute,
  registerTraceEventsTopNThreadsSearchRoute,
} from './topn';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>, logger?: Logger) {
  registerFlameChartElasticSearchRoute(router, logger!);
  registerTraceEventsTopNContainersSearchRoute(router, logger!);
  registerTraceEventsTopNDeploymentsSearchRoute(router, logger!);
  registerTraceEventsTopNHostsSearchRoute(router, logger!);
  registerTraceEventsTopNStackTracesSearchRoute(router, logger!);
  registerTraceEventsTopNThreadsSearchRoute(router, logger!);
}
