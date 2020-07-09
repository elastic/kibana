/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { ConfigType } from '../config';

import {
  createExceptionListItemRoute,
  createExceptionListRoute,
  createListIndexRoute,
  createListItemRoute,
  createListRoute,
  deleteExceptionListItemRoute,
  deleteExceptionListRoute,
  deleteListIndexRoute,
  deleteListItemRoute,
  deleteListRoute,
  exportListItemRoute,
  findExceptionListItemRoute,
  findExceptionListRoute,
  findListItemRoute,
  findListRoute,
  importListItemRoute,
  patchListItemRoute,
  patchListRoute,
  readExceptionListItemRoute,
  readExceptionListRoute,
  readListIndexRoute,
  readListItemRoute,
  readListRoute,
  updateExceptionListItemRoute,
  updateExceptionListRoute,
  updateListItemRoute,
  updateListRoute,
} from '.';

export const initRoutes = (router: IRouter, config: ConfigType): void => {
  // lists
  createListRoute(router);
  readListRoute(router);
  updateListRoute(router);
  deleteListRoute(router);
  patchListRoute(router);
  findListRoute(router);

  // list items
  createListItemRoute(router);
  readListItemRoute(router);
  updateListItemRoute(router);
  deleteListItemRoute(router);
  patchListItemRoute(router);
  exportListItemRoute(router);
  importListItemRoute(router, config);
  findListItemRoute(router);

  // indexes of lists
  createListIndexRoute(router);
  readListIndexRoute(router);
  deleteListIndexRoute(router);

  // exception lists
  createExceptionListRoute(router);
  readExceptionListRoute(router);
  updateExceptionListRoute(router);
  deleteExceptionListRoute(router);
  findExceptionListRoute(router);

  // exception list items
  createExceptionListItemRoute(router);
  readExceptionListItemRoute(router);
  updateExceptionListItemRoute(router);
  deleteExceptionListItemRoute(router);
  findExceptionListItemRoute(router);
};
