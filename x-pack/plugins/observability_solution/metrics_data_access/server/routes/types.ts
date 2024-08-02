/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core-http-server';
import { MetricsDataAccessRouterHandlerContext } from '../types';

export type MetricsDataAccessRouter = IRouter<MetricsDataAccessRouterHandlerContext>;
export interface SetupRouteOptions {
  router: MetricsDataAccessRouter;
}
