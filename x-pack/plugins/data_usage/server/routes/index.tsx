/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataUsageRouter } from '../types';
import { registerDataStreamsRoute, registerUsageMetricsRoute } from './internal';
import { DataUsageService } from '../services';

export const registerDataUsageRoutes = (
  router: DataUsageRouter,
  dataUsageService: DataUsageService
) => {
  registerUsageMetricsRoute(router, dataUsageService);
  registerDataStreamsRoute(router, dataUsageService);
};
