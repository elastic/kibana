/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { updateListsRoute } from './update_lists_route';
import { updateListsItemsRoute } from './update_list_items_route';

import {
  createListsIndexRoute,
  createListsItemsRoute,
  createListsRoute,
  deleteListsIndexRoute,
  deleteListsItemsRoute,
  deleteListsRoute,
  exportListsItemsRoute,
  importListsItemsRoute,
  patchListsItemsRoute,
  patchListsRoute,
  readListsIndexRoute,
  readListsItemsRoute,
  readListsRoute,
} from '.';

export const initRoutes = (router: IRouter): void => {
  // lists
  createListsRoute(router);
  readListsRoute(router);
  updateListsRoute(router);
  deleteListsRoute(router);
  patchListsRoute(router);

  // lists items
  createListsItemsRoute(router);
  readListsItemsRoute(router);
  updateListsItemsRoute(router);
  deleteListsItemsRoute(router);
  patchListsItemsRoute(router);
  exportListsItemsRoute(router);
  importListsItemsRoute(router);

  // indexes of lists
  createListsIndexRoute(router);
  readListsIndexRoute(router);
  deleteListsIndexRoute(router);
};
