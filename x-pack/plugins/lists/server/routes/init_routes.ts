/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { ConfigType } from '../config';

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

export const initRoutes = (router: IRouter, config: ConfigType): void => {
  // lists
  createListsRoute(router, config);
  readListsRoute(router, config);
  // updateListsRoute(router, config); // TODO
  deleteListsRoute(router, config);
  patchListsRoute(router, config);

  // lists items
  createListsItemsRoute(router, config);
  readListsItemsRoute(router, config);
  // updateListsItemsRoute(router, config); // TODO
  deleteListsItemsRoute(router, config);
  patchListsItemsRoute(router, config);
  exportListsItemsRoute(router, config);
  importListsItemsRoute(router, config);

  // indexes of lists
  createListsIndexRoute(router, config);
  readListsIndexRoute(router, config);
  deleteListsIndexRoute(router, config);
};
