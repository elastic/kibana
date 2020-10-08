/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Service, IRouter } from '../../../types';
import { createTimeSeriesQueryRoute } from './time_series_query';
import { createFieldsRoute } from './fields';
import { createIndicesRoute } from './indices';

interface RegisterRoutesParams {
  service: Service;
  router: IRouter;
  baseRoute: string;
}
export function registerRoutes(params: RegisterRoutesParams) {
  const { service, router, baseRoute } = params;
  createTimeSeriesQueryRoute(service, router, baseRoute);
  createFieldsRoute(service, router, baseRoute);
  createIndicesRoute(service, router, baseRoute);
}
