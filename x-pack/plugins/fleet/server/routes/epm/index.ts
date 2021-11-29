/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';
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
import type { FleetRouter } from '../../types/request_context';
import type { FleetAuthzRouter } from '../security';

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

export const registerRoutes = (routers: {
  fleetRouter: FleetAuthzRouter;
  superuser: FleetRouter;
}) => {
  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: GetCategoriesRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getCategoriesHandler
  );

  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getListHandler
  );

  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getLimitedListHandler
  );

  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getStatsHandler
  );

  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getFileHandler
  );

  routers.fleetRouter.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getInfoHandler
  );

  routers.fleetRouter.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: UpdatePackageRequestSchema,
      fleetAuthz: {
        integrations: ['upgradePackages', 'writePackageSettings'],
      },
    },
    updatePackageHandler
  );

  routers.fleetRouter.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      fleetAuthz: {
        integrations: ['installPackages'],
      },
    },
    installPackageFromRegistryHandler
  );

  routers.fleetRouter.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkUpgradePackagesFromRegistryRequestSchema,
      fleetAuthz: {
        integrations: ['installPackages', 'upgradePackages'],
      },
    },
    bulkInstallPackagesFromRegistryHandler
  );

  // Only allow upload for superuser
  routers.superuser.post(
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

  routers.fleetRouter.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      fleetAuthz: {
        integrations: ['removePackages'],
      },
    },
    deletePackageHandler
  );
};
