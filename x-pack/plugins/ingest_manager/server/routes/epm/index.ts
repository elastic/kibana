/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';
import {
  getCategoriesHandler,
  getListHandler,
  getFileHandler,
  getInfoHandler,
  getDataStreamHandler,
  installPackageHandler,
  deletePackageHandler,
} from './handlers';
import {
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  GetDataStreamRequestSchema,
  InstallPackageRequestSchema,
  DeletePackageRequestSchema,
} from '../../types';

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getCategoriesHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getFileHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getInfoHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.DATA_STREAM,
      validate: GetDataStreamRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getDataStreamHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_PATTERN,
      validate: InstallPackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    installPackageHandler
  );

  router.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    deletePackageHandler
  );
};
