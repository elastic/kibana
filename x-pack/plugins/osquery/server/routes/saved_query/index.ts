/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';

import { createSavedQueryRoute } from './create_saved_query_route';
import { deleteSavedQueryRoute } from './delete_saved_query_route';
import { findSavedQueryRoute } from './find_saved_query_route';
import { readSavedQueryRoute } from './read_saved_query_route';
import { updateSavedQueryRoute } from './update_saved_query_route';

export const initSavedQueryRoutes = (router: IRouter) => {
  createSavedQueryRoute(router);
  deleteSavedQueryRoute(router);
  findSavedQueryRoute(router);
  readSavedQueryRoute(router);
  updateSavedQueryRoute(router);
};
