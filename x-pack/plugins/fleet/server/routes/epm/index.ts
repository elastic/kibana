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

import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';
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
import type { FleetRouter } from '../../types/request_context';

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

export const registerRoutes = (routers: { rbac: FleetRouter; superuser: FleetRouter }) => {
  routers.rbac.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: GetCategoriesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getCategoriesHandler
  );

  routers.rbac.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: GetPackagesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getListHandler
  );

  routers.rbac.get(
    {
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getLimitedListHandler
  );

  routers.rbac.get(
    {
      path: EPM_API_ROUTES.STATS_PATTERN,
      validate: GetStatsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getStatsHandler
  );

  routers.rbac.get(
    {
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      validate: GetFileRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFileHandler
  );

  routers.rbac.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: GetInfoRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getInfoHandler
  );

  routers.superuser.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: UpdatePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updatePackageHandler
  );

  routers.superuser.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      validate: InstallPackageFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    installPackageFromRegistryHandler
  );

  routers.superuser.post(
    {
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      validate: BulkUpgradePackagesFromRegistryRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    bulkInstallPackagesFromRegistryHandler
  );

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

  routers.superuser.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackageRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deletePackageHandler
  );

  // deprecated since 8.0
  routers.rbac.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: GetInfoRequestSchemaDeprecated,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
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

  routers.superuser.put(
    {
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: UpdatePackageRequestSchemaDeprecated,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
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

  routers.superuser.post(
    {
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN_DEPRECATED,
      validate: InstallPackageFromRegistryRequestSchemaDeprecated,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    async (context, request, response) => {
      const newRequest = { ...request, params: splitPkgKey(request.params.pkgkey) } as any;
      const resp: IKibanaResponse<InstallPackageResponse> = await installPackageFromRegistryHandler(
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

  routers.superuser.delete(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN_DEPRECATED,
      validate: DeletePackageRequestSchemaDeprecated,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
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
