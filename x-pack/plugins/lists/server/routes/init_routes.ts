/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import {
  createExceptionListItemRoute,
  createExceptionListRoute,
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
  readExceptionListItemRoute,
  readExceptionListRoute,
  readListIndexRoute,
  readListItemRoute,
  readListRoute,
  updateExceptionListRoute,
  updateListItemRoute,
  updateListRoute,
} from '.';

export const initRoutes = (router: IRouter): void => {
  // lists
  createListRoute(router);
  readListRoute(router);
  updateListRoute(router);
  deleteListRoute(router);
  patchListRoute(router);

  // list items
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

  // exception lists
  createExceptionListRoute(router);
  readExceptionListRoute(router);
  updateExceptionListRoute(router);

  // exception list items
  createExceptionListItemRoute(router);
  readExceptionListItemRoute(router);
};
