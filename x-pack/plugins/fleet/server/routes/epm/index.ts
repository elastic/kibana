/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';

import { parseExperimentalConfigValue } from '../../../common/experimental_features';

import { API_VERSIONS } from '../../../common/constants';

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
  GetInputsRequestSchema,
  InstallKibanaAssetsRequestSchema,
  DeleteKibanaAssetsRequestSchema,
  GetCategoriesResponseSchema,
  GetPackagesResponseSchema,
  GetInstalledPackagesResponseSchema,
  GetLimitedPackagesResponseSchema,
  GetStatsResponseSchema,
  GetInputsResponseSchema,
  GetFileResponseSchema,
  GetInfoResponseSchema,
  UpdatePackageResponseSchema,
  InstallPackageResponseSchema,
  InstallKibanaAssetsResponseSchema,
  BulkInstallPackagesFromRegistryResponseSchema,
  DeletePackageResponseSchema,
  GetVerificationKeyIdResponseSchema,
  GetDataStreamsResponseSchema,
  GetBulkAssetsResponseSchema,
  ReauthorizeTransformResponseSchema,
} from '../../types';
import type { FleetConfigType } from '../../config';

import { genericErrorResponse } from '../schema/errors';

import {
  getCategoriesHandler,
  getListHandler,
  getInstalledListHandler,
  getLimitedListHandler,
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
  getInputsHandler,
} from './handlers';
import { getFileHandler } from './file_handler';
import {
  deletePackageKibanaAssetsHandler,
  installPackageKibanaAssetsHandler,
} from './kibana_assets_handler';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const INSTALL_PACKAGES_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { installPackages: true },
};

export const READ_PACKAGE_INFO_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { readPackageInfo: true },
};

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);

  router.versioned
    .get({
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `List package categories`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCategoriesRequestSchema,
          response: {
            200: {
              body: () => GetCategoriesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getCategoriesHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.LIST_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `List packages`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetPackagesRequestSchema,
          response: {
            200: {
              body: () => GetPackagesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.INSTALLED_LIST_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get installed packages`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInstalledPackagesRequestSchema,
          response: {
            200: {
              body: () => GetInstalledPackagesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getInstalledListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get limited package list`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => GetLimitedPackagesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getLimitedListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.STATS_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get package stats`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetStatsRequestSchema,
          response: {
            200: {
              body: () => GetStatsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getStatsHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.INPUTS_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get inputs template`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInputsRequestSchema,
          response: {
            200: {
              body: () => GetInputsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getInputsHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get package file`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetFileRequestSchema,
          response: {
            200: {
              body: () => GetFileResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getFileHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(fleetAuthz, getRouteRequiredAuthz('get', EPM_API_ROUTES.INFO_PATTERN))
          .granted,
      description: `Get package`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInfoRequestSchema,
          response: {
            200: {
              body: () => GetInfoResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getInfoHandler
    );

  router.versioned
    .put({
      path: EPM_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        integrations: { writePackageSettings: true },
      },
      description: `Update package settings`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdatePackageRequestSchema,
          response: {
            200: {
              body: () => UpdatePackageResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      updatePackageHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
      description: `Install package from registry`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallPackageFromRegistryRequestSchema,
          response: {
            200: {
              body: () => InstallPackageResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      installPackageFromRegistryHandler
    );

  if (experimentalFeatures.useSpaceAwareness) {
    router.versioned
      .post({
        path: EPM_API_ROUTES.INSTALL_KIBANA_ASSETS_PATTERN,
        fleetAuthz: {
          integrations: { installPackages: true },
        },
        description: `Install Kibana assets for package`,
        options: {
          tags: ['oas_tag:Elastic Package Manager (EPM)'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: InstallKibanaAssetsRequestSchema,
            response: {
              200: {
                body: () => InstallKibanaAssetsResponseSchema,
              },
              400: {
                body: genericErrorResponse,
              },
            },
          },
        },
        installPackageKibanaAssetsHandler
      );

    router.versioned
      .delete({
        path: EPM_API_ROUTES.DELETE_KIBANA_ASSETS_PATTERN,
        fleetAuthz: {
          integrations: { installPackages: true },
        },
        description: `Delete Kibana assets for package`,
        options: {
          tags: ['oas_tag:Elastic Package Manager (EPM)'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: DeleteKibanaAssetsRequestSchema,
            response: {
              200: {
                body: () => InstallKibanaAssetsResponseSchema,
              },
              400: {
                body: genericErrorResponse,
              },
            },
          },
        },
        deletePackageKibanaAssetsHandler
      );
  }

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      fleetAuthz: {
        integrations: { installPackages: true, upgradePackages: true },
      },
      description: `Bulk install packages`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkInstallPackagesFromRegistryRequestSchema,
          response: {
            200: {
              body: () => BulkInstallPackagesFromRegistryResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      bulkInstallPackagesFromRegistryHandler
    );

  // Only allow upload for superuser
  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN,
      options: {
        body: {
          accepts: ['application/gzip', 'application/zip'],
          parse: false,
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: [`oas_tag:Elastic Package Manager (EPM)`],
      },
      fleetAuthz: {
        integrations: { uploadPackages: true },
      },
      description: `Install package by upload`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallPackageByUploadRequestSchema,
          response: {
            200: {
              body: () => InstallPackageResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      installPackageByUploadHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.CUSTOM_INTEGRATIONS_PATTERN,
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
      description: `Create custom integration`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateCustomIntegrationRequestSchema,
          response: {
            200: {
              body: () => InstallPackageResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      createCustomIntegrationHandler
    );

  router.versioned
    .delete({
      path: EPM_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        integrations: { removePackages: true },
      },
      description: `Delete package`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeletePackageRequestSchema,
          response: {
            200: {
              body: () => DeletePackageResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },

      deletePackageHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.VERIFICATION_KEY_ID,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Get a package signature verification key ID`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => GetVerificationKeyIdResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getVerificationKeyIdHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.DATA_STREAMS_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `List data streams`,
      options: {
        tags: ['oas_tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetDataStreamsRequestSchema,
          response: {
            200: {
              body: () => GetDataStreamsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getDataStreamsHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_ASSETS_PATTERN,
      fleetAuthz: READ_PACKAGE_INFO_AUTHZ,
      description: `Bulk get assets`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetBulkAssetsRequestSchema,
          response: {
            200: {
              body: () => GetBulkAssetsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getBulkAssetsHandler
    );

  // deprecated since 8.0
  // This endpoint should be marked as internal but the router selects this endpoint over the new GET one
  // For now keeping it public
  router.versioned
    .get({
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', EPM_API_ROUTES.INFO_PATTERN_DEPRECATED)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetInfoRequestSchemaDeprecated },
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

  router.versioned
    .put({
      path: EPM_API_ROUTES.INFO_PATTERN_DEPRECATED,

      fleetAuthz: {
        integrations: { writePackageSettings: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: UpdatePackageRequestSchemaDeprecated },
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

  // This endpoint should be marked as internal but the router selects this endpoint over the new POST
  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN_DEPRECATED,
      fleetAuthz: INSTALL_PACKAGES_AUTHZ,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: InstallPackageFromRegistryRequestSchemaDeprecated },
      },
      async (context, request, response) => {
        const newRequest = {
          ...request,
          params: splitPkgKey(request.params.pkgkey),
          query: request.query,
        } as any;
        const resp: IKibanaResponse<InstallPackageResponse> =
          await installPackageFromRegistryHandler(context, newRequest, response);
        if (resp.payload?.items) {
          return response.ok({ body: { ...resp.payload, response: resp.payload.items } });
        }
        return resp;
      }
    );

  router.versioned
    .delete({
      path: EPM_API_ROUTES.DELETE_PATTERN_DEPRECATED,

      fleetAuthz: {
        integrations: { removePackages: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeletePackageRequestSchemaDeprecated },
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
  router.versioned
    .post({
      path: EPM_API_ROUTES.REAUTHORIZE_TRANSFORMS,
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
      description: `Authorize transforms`,
      options: {
        tags: ['oas_tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: ReauthorizeTransformRequestSchema,
          response: {
            200: {
              body: () => ReauthorizeTransformResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      reauthorizeTransformsHandler
    );
};
