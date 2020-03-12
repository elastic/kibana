/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { PLUGIN_ID, DATASOURCE_API_ROUTES } from '../../constants';
import {
  GetDatasourcesRequestSchema,
  GetOneDatasourceRequestSchema,
  CreateDatasourceRequestSchema,
  UpdateDatasourceRequestSchema,
} from '../../types';
import {
  getDatasourcesHandler,
  getOneDatasourceHandler,
  createDatasourceHandler,
  updateDatasourceHandler,
} from './handlers';

export const registerRoutes = (router: IRouter) => {
  // List
  router.get(
    {
      path: DATASOURCE_API_ROUTES.LIST_PATTERN,
      validate: GetDatasourcesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getDatasourcesHandler
  );

  // Get one
  router.get(
    {
      path: DATASOURCE_API_ROUTES.INFO_PATTERN,
      validate: GetOneDatasourceRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneDatasourceHandler
  );

  // Create
  router.post(
    {
      path: DATASOURCE_API_ROUTES.CREATE_PATTERN,
      validate: CreateDatasourceRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createDatasourceHandler
  );

  // Update
  router.put(
    {
      path: DATASOURCE_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateDatasourceRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updateDatasourceHandler
  );
};
