/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { updateListRoute } from './update_list_route';
import { updateListItemRoute } from './update_list_item_route';

import {
  createListIndexRoute,
  createListItemRoute,
  createListRoute,
  deleteListIndexRoute,
  deleteListItemRoute,
  deleteListRoute,
  exportListItemRoute,
  importListItemRoute,
  patchListItemRoute,
  patchListRoute,
  readListIndexRoute,
  readListItemRoute,
  readListRoute,
} from '.';

export const initRoutes = (router: IRouter): void => {
  // lists
  createListRoute(router);
  readListRoute(router);
  updateListRoute(router);
  deleteListRoute(router);
  patchListRoute(router);

  // lists items
  createListItemRoute(router);
  readListItemRoute(router);
  updateListItemRoute(router);
  deleteListItemRoute(router);
  patchListItemRoute(router);
  exportListItemRoute(router);
  importListItemRoute(router);

  // indexes of lists
  createListIndexRoute(router);
  readListIndexRoute(router);
  deleteListIndexRoute(router);
};
