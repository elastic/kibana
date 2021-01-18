/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';
import {
  getCategoriesHandler,
  getListHandler,
  getLimitedListHandler,
  getFileHandler,
  getInfoHandler,
  installPackageFromRegistryHandler,
  installPackageByUploadHandler,
  deletePackageHandler,
  bulkInstallPackagesFromRegistryHandler,
  getStatsHandler,
} from './handlers';
import {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  BulkUpgradePackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
} from '../../types';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: GetCategoriesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getCategoriesHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getLimitedListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getStatsHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFileHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getInfoHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    installPackageFromRegistryHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkUpgradePackagesFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    bulkInstallPackagesFromRegistryHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN,
      validate: InstallPackageByUploadRequestSchema,
      options: {
        tags: [`access:${PLUGIN_ID}-all`],
        body: {
          accepts: ['application/gzip', 'application/zip'],
          parse: false,
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
      },
    },
    installPackageByUploadHandler
  );

  router.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deletePackageHandler
  );
};
