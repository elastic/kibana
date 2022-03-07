/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from 'src/core/server';

import type {
  DeletePackageResponse,
  GetInfoResponse,
  InstallPackageResponse,
  UpdatePackageResponse,
} from '../../../common';

import { EPM_API_ROUTES } from '../../constants';
import { splitPkgKey } from '../../services/epm/registry';
import {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  GetInfoRequestSchemaDeprecated,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageFromRegistryRequestSchemaDeprecated,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  DeletePackageRequestSchemaDeprecated,
  BulkUpgradePackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
  UpdatePackageRequestSchema,
  UpdatePackageRequestSchemaDeprecated,
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
        integrations: { readPackageInfo: true },
      },
    },
    getCategoriesHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    getListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    getLimitedListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    getStatsHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    getFileHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    getInfoHandler
  );

  router.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: UpdatePackageRequestSchema,
      fleetAuthz: {
        integrations: { upgradePackages: true, writePackageSettings: true },
      },
    },
    updatePackageHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      fleetAuthz: {
        integrations: { installPackages: true },
      },
    },
    installPackageFromRegistryHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkUpgradePackagesFromRegistryRequestSchema,
      fleetAuthz: {
        integrations: { installPackages: true, upgradePackages: true },
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
        body: {
          accepts: ['application/gzip', 'application/zip'],
          parse: false,
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
      },
      fleetAuthz: {
        integrations: { uploadPackages: true },
      },
    },
    installPackageByUploadHandler
  );

  router.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      fleetAuthz: {
        integrations: { removePackages: true },
      },
    },
    deletePackageHandler
  );

  // deprecated since 8.0
  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: GetInfoRequestSchemaDeprecated,
      fleetAuthz: {
        integrations: { readPackageInfo: true },
      },
    },
    async (context, request, response) => {
      const newRequest = { ...request, params: splitPkgKey(request.params.pkgkey) } as any;
      const resp: IKibanaResponse<GetInfoResponse> = await getInfoHandler(
        context,
        newRequest,
        response
      );
      if (resp.payload?.item) {
        // returning item as well here, because pkgVersion is optional in new GET endpoint, and if not specified, the router selects the deprecated route
        return response.ok({ body: { item: resp.payload.item, response: resp.payload.item } });
      }
      return resp;
    }
  );

  router.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: UpdatePackageRequestSchemaDeprecated,
      fleetAuthz: {
        integrations: { upgradePackages: true, writePackageSettings: true },
      },
    },
    async (context, request, response) => {
      const newRequest = { ...request, params: splitPkgKey(request.params.pkgkey) } as any;
      const resp: IKibanaResponse<UpdatePackageResponse> = await updatePackageHandler(
        context,
        newRequest,
        response
      );
      if (resp.payload?.item) {
        return response.ok({ body: { response: resp.payload.item } });
      }
      return resp;
    }
  );

  router.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN_DEPRECATED,
      validate: InstallPackageFromRegistryRequestSchemaDeprecated,
      fleetAuthz: {
        integrations: { installPackages: true },
      },
    },
    async (context, request, response) => {
      const newRequest = { ...request, params: splitPkgKey(request.params.pkgkey) } as any;
      const resp: IKibanaResponse<InstallPackageResponse> = await installPackageFromRegistryHandler(
        context,
        newRequest,
        response
      );
      if (resp.payload?.items) {
        return response.ok({ body: { ...resp.payload, response: resp.payload.items } });
      }
      return resp;
    }
  );

  router.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN_DEPRECATED,
      validate: DeletePackageRequestSchemaDeprecated,
      fleetAuthz: {
        integrations: { removePackages: true },
      },
    },
    async (context, request, response) => {
      const newRequest = { ...request, params: splitPkgKey(request.params.pkgkey) } as any;
      const resp: IKibanaResponse<DeletePackageResponse> = await deletePackageHandler(
        context,
        newRequest,
        response
      );
      if (resp.payload?.items) {
        return response.ok({ body: { response: resp.payload.items } });
      }
      return resp;
    }
  );
};
