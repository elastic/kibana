/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { ProfilingRequestHandlerContext } from '../types';
import { registerFlameChartRoutes } from './flamechart/routes';

export interface RouteRegisterParameters {
  router: IRouter<ProfilingRequestHandlerContext>;
  logger: Logger;
}

export function registerRoutes(params: RouteRegisterParameters) {
  registerFlameChartRoutes(params);
}
