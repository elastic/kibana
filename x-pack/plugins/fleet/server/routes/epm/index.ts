/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';

import type { FleetAuthz } from '../../../common';

import {
  calculateRouteAuthz,
  type FleetAuthzRouter,
  getRouteRequiredAuthz,
} from '../../services/security';
import type { FleetAuthzRouteConfig } from '../../services/security/types';

import type {
  DeletePackageResponse,
  GetInfoResponse,
  InstallPackageResponse,
  UpdatePackageResponse,
} from '../../../common/types';

import { EPM_API_ROUTES } from '../../constants';
import { splitPkgKey } from '../../services/epm/registry';
import {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetInstalledPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  GetInfoRequestSchemaDeprecated,
  GetBulkAssetsRequestSchema,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageFromRegistryRequestSchemaDeprecated,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  DeletePackageRequestSchemaDeprecated,
  BulkInstallPackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
  UpdatePackageRequestSchema,
  UpdatePackageRequestSchemaDeprecated,
  ReauthorizeTransformRequestSchema,
  GetDataStreamsRequestSchema,
  CreateCustomIntegrationRequestSchema,
} from '../../types';

import {
  getCategoriesHandler,
  getListHandler,
  getInstalledListHandler,
  getLimitedListHandler,
  getFileHandler,
  getInfoHandler,
  getBulkAssetsHandler,
  installPackageFromRegistryHandler,
  installPackageByUploadHandler,
  deletePackageHandler,
  bulkInstallPackagesFromRegistryHandler,
  getStatsHandler,
  updatePackageHandler,
  getVerificationKeyIdHandler,
  reauthorizeTransformsHandler,
  getDataStreamsHandler,
  createCustomIntegrationHandler,
} from './handlers';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const INSTALL_PACKAGES_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { installPackages: true },
};

export const READ_PACKAGE_INFO_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { readPackageInfo: true },
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: GetCategoriesRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getCategoriesHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INSTALLED_LIST_PATTERN,
      validate: GetInstalledPackagesRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getInstalledListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getLimitedListHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getStatsHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getFileHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(fleetAuthz, getRouteRequiredAuthz('get', EPM_API_ROUTES.INFO_PATTERN))
          .granted,
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
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
    },
    installPackageFromRegistryHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkInstallPackagesFromRegistryRequestSchema,
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

  router.post(
    {
      path: EPM_API_ROUTES.CUSTOM_INTEGRATIONS_PATTERN,
      validate: CreateCustomIntegrationRequestSchema,
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
    },
    createCustomIntegrationHandler
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

  router.get(
    {
      path: EPM_API_ROUTES.VERIFICATION_KEY_ID,
      validate: false,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getVerificationKeyIdHandler
  );

  router.get(
    {
      path: EPM_API_ROUTES.DATA_STREAMS_PATTERN,
      validate: GetDataStreamsRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getDataStreamsHandler
  );

  router.post(
    {
      path: EPM_API_ROUTES.BULK_ASSETS_PATTERN,
      validate: GetBulkAssetsRequestSchema,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
    },
    getBulkAssetsHandler
  );

  // deprecated since 8.0
  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: GetInfoRequestSchemaDeprecated,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', EPM_API_ROUTES.INFO_PATTERN_DEPRECATED)
        ).granted,
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
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
    },
    async (context, request, response) => {
      const newRequest = {
        ...request,
        params: splitPkgKey(request.params.pkgkey),
        query: request.query,
      } as any;
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

  // Update transforms with es-secondary-authorization headers,
  // append authorized_by to transform's _meta, and start transforms
  router.post(
    {
      path: EPM_API_ROUTES.REAUTHORIZE_TRANSFORMS,
      validate: ReauthorizeTransformRequestSchema,
      fleetAuthz: {
        ...INSTALL_PACKAGES_AUTHZ,
        packagePrivileges: {
          transform: {
            actions: {
              canStartStopTransform: {
                executePackageAction: true,
              },
            },
          },
        },
      },
    },
    reauthorizeTransformsHandler
  );
};
