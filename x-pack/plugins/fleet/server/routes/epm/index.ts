/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from 'src/core/server';

import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';
import type { FleetRequestHandlerContext } from '../../types';
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
  UpdatePackageRequestSchema,
} from '../../types';
import { enforceSuperUser } from '../security';

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
  updatePackageHandler,
} from './handlers';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const registerRoutes = (router: IRouter<FleetRequestHandlerContext>) => {
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
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getLimitedListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
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

  router.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: UpdatePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    enforceSuperUser(updatePackageHandler)
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    enforceSuperUser(installPackageFromRegistryHandler)
  );

  router.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkUpgradePackagesFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    enforceSuperUser(bulkInstallPackagesFromRegistryHandler)
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
    enforceSuperUser(installPackageByUploadHandler)
  );

  router.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    enforceSuperUser(deletePackageHandler)
  );
};
