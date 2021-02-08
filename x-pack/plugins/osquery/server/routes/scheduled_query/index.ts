/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';

import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
// import { createScheduledQueryRoute } from './create_scheduled_query_route';
import { deleteScheduledQueryRoute } from './delete_scheduled_query_route';
import { findScheduledQueryRoute } from './find_scheduled_query_route';
import { readScheduledQueryRoute } from './read_scheduled_query_route';
import { updateScheduledQueryRoute } from './update_scheduled_query_route';

export const initScheduledQueryRoutes = (router: IRouter, context: OsqueryAppContext) => {
  // createScheduledQueryRoute(router);
  // deleteScheduledQueryRoute(router);
  findScheduledQueryRoute(router, context);
  readScheduledQueryRoute(router, context);
  // updateScheduledQueryRoute(router);
};
