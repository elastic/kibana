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

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: GetCategoriesRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getCategoriesHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getLimitedListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getStatsHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getFileHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      fleetAuthz: {
        integrations: ['readPackageInfo'],
      },
    },
    getInfoHandler
  );

  router.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: UpdatePackageRequestSchema,
      fleetAuthz: {
        integrations: ['upgradePackages', 'writePackageSettings'],
      },
    },
    updatePackageHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      fleetAuthz: {
        integrations: ['installPackages'],
      },
    },
    installPackageFromRegistryHandler
  );

  router.post(
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
      fleetRequireSuperuser: true,
    },
    installPackageByUploadHandler
  );

  router.delete(
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
