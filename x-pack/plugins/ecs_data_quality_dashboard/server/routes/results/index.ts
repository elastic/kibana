/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { postIndexResultsRoute } from './post_index_results';
import { getIndexResultsLatestRoute } from './get_index_results_latest';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { getIndexResultsRoute } from './get_index_results';

export const resultsRoutes = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  postIndexResultsRoute(router, logger);
  getIndexResultsLatestRoute(router, logger);
  getIndexResultsRoute(router, logger);
};
