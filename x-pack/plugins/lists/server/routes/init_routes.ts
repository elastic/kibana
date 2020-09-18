/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { SecurityPluginSetup } from '../../../security/server';
import { ConfigType } from '../config';

import {
  createEndpointListItemRoute,
  createEndpointListRoute,
  createExceptionListItemRoute,
  createExceptionListRoute,
  createListIndexRoute,
  createListItemRoute,
  createListRoute,
  deleteEndpointListItemRoute,
  deleteExceptionListItemRoute,
  deleteExceptionListRoute,
  deleteListIndexRoute,
  deleteListItemRoute,
  deleteListRoute,
  exportListItemRoute,
  findEndpointListItemRoute,
  findExceptionListItemRoute,
  findExceptionListRoute,
  findListItemRoute,
  findListRoute,
  importListItemRoute,
  patchListItemRoute,
  patchListRoute,
  readEndpointListItemRoute,
  readExceptionListItemRoute,
  readExceptionListRoute,
  readListIndexRoute,
  readListItemRoute,
  readListRoute,
  readPrivilegesRoute,
  updateEndpointListItemRoute,
  updateExceptionListItemRoute,
  updateExceptionListRoute,
  updateListItemRoute,
  updateListRoute,
} from '.';

export const initRoutes = (
  router: IRouter,
  config: ConfigType,
  security: SecurityPluginSetup | null | undefined
): void => {
  // lists
  createListRoute(router);
  readListRoute(router);
  updateListRoute(router);
  deleteListRoute(router);
  patchListRoute(router);
  findListRoute(router);
  readPrivilegesRoute(router, security);

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

  // endpoint list
  createEndpointListRoute(router);

  // endpoint list items
  createEndpointListItemRoute(router);
  readEndpointListItemRoute(router);
  updateEndpointListItemRoute(router);
  deleteEndpointListItemRoute(router);
  findEndpointListItemRoute(router);
};
