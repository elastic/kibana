/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';

import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
// import { createScheduledQueryRoute } from './create_scheduled_query_route';
// import { deleteScheduledQueryRoute } from './delete_scheduled_query_route';
import { findScheduledQueryGroupRoute } from './find_scheduled_query_group_route';
import { readScheduledQueryGroupRoute } from './read_scheduled_query_group_route';
// import { updateScheduledQueryRoute } from './update_scheduled_query_route';

export const initScheduledQueryGroupRoutes = (router: IRouter, context: OsqueryAppContext) => {
  // createScheduledQueryRoute(router);
  // deleteScheduledQueryRoute(router);
  findScheduledQueryGroupRoute(router, context);
  readScheduledQueryGroupRoute(router, context);
  // updateScheduledQueryRoute(router);
};
