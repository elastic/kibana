/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { initSavedQueryRoutes } from './saved_query';
import { initScheduledQueryRoutes } from './scheduled_query';
import { initActionRoutes } from './action';
import { OsqueryAppContext } from '../lib/osquery_app_context_services';

export const defineRoutes = (router: IRouter, context: OsqueryAppContext) => {
  initActionRoutes(router);
  initSavedQueryRoutes(router);
  initScheduledQueryRoutes(router, context);
};
