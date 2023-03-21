/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { createLiveQueryRoute } from './create_live_query_route';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getLiveQueryDetailsRoute } from './get_live_query_details_route';
import { getLiveQueryResultsRoute } from './get_live_query_results_route';
import { findLiveQueryRoute } from './find_live_query_route';

export const initLiveQueryRoutes = (
  router: IRouter<DataRequestHandlerContext>,
  context: OsqueryAppContext
) => {
  findLiveQueryRoute(router);
  createLiveQueryRoute(router, context);
  getLiveQueryDetailsRoute(router);
  getLiveQueryResultsRoute(router);
};
