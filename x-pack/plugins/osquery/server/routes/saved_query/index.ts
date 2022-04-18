/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';

import { createSavedQueryRoute } from './create_saved_query_route';
import { deleteSavedQueryRoute } from './delete_saved_query_route';
import { findSavedQueryRoute } from './find_saved_query_route';
import { readSavedQueryRoute } from './read_saved_query_route';
import { updateSavedQueryRoute } from './update_saved_query_route';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const initSavedQueryRoutes = (router: IRouter, context: OsqueryAppContext) => {
  createSavedQueryRoute(router, context);
  deleteSavedQueryRoute(router);
  findSavedQueryRoute(router);
  readSavedQueryRoute(router);
  updateSavedQueryRoute(router, context);
};
