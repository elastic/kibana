/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import semverValid from 'semver/functions/valid';
import type { HttpResponseOptions } from '@kbn/core/server';

import { pick } from 'lodash';

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';
import { generateTransformSecondaryAuthHeaders } from '../../services/api_keys/transform_api_keys';
import { handleTransformReauthorizeAndStart } from '../../services/epm/elasticsearch/transform/reauthorize';

import type {
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageResponse,
  GetCategoriesResponse,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  IBulkInstallPackageHTTPError,
  GetStatsResponse,
  UpdatePackageResponse,
  GetVerificationKeyIdResponse,
  GetBulkAssetsResponse,
  GetInstalledPackagesResponse,
  GetEpmDataStreamsResponse,
  AssetSOObject,
} from '../../../common/types';
import type {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetInstalledPackagesRequestSchema,
  GetDataStreamsRequestSchema,
  GetInfoRequestSchema,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  BulkInstallPackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
  FleetRequestHandler,
  UpdatePackageRequestSchema,
  GetLimitedPackagesRequestSchema,
  GetBulkAssetsRequestSchema,
  CreateCustomIntegrationRequestSchema,
  GetInputsRequestSchema,
} from '../../types';
import {
  bulkInstallPackages,
  getCategories,
  getPackages,
  getInstalledPackages,
  getPackageInfo,
  isBulkInstallError,
  installPackage,
  removeInstallation,
  getLimitedPackages,
  getBulkAssets,
  getTemplateInputs,
} from '../../services/epm/packages';
import type { BulkInstallResponse } from '../../services/epm/packages';
import { defaultFleetErrorHandler, fleetErrorToResponseOptions, FleetError } from '../../errors';
import { appContextService, checkAllowedPackages } from '../../services';
import { getPackageUsageStats } from '../../services/epm/packages/get';
import { updatePackage } from '../../services/epm/packages/update';
import { getGpgKeyIdOrUndefined } from '../../services/epm/packages/package_verification';
import type {
  ReauthorizeTransformRequestSchema,
  PackageListItem,
  PackageList,
  PackageInfo,
  InstallationInfo,
} from '../../types';
import { getDataStreams } from '../../services/epm/data_streams';
import { NamingCollisionError } from '../../services/epm/packages/custom_integrations/validation/check_naming_collision';
import { DatasetNamePrefixError } from '../../services/epm/packages/custom_integrations/validation/check_dataset_name_format';

const CACHE_CONTROL_10_MINUTES_HEADER: HttpResponseOptions['headers'] = {
  'cache-control': 'max-age=600',
};

export const getCategoriesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetCategoriesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const res = await getCategories({
      ...request.query,
    });
    const body: GetCategoriesResponse = {
      items: res,
      response: res,
    };
    return response.ok({ body, headers: { ...CACHE_CONTROL_10_MINUTES_HEADER } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getListHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetPackagesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const res = await getPackages({
      savedObjectsClient,
      ...request.query,
    });
    const flattenedRes = res.map((pkg) => soToInstallationInfo(pkg)) as PackageList;
    const body: GetPackagesResponse = {
      items: flattenedRes,
      response: res,
    };
    return response.ok({
      body,
      // Only cache responses where the installation status is excluded, otherwise the request
      // needs up-to-date information on whether the package is installed so we can't cache it
      headers: request.query.excludeInstallStatus ? { ...CACHE_CONTROL_10_MINUTES_HEADER } : {},
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getInstalledListHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetInstalledPackagesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const res = await getInstalledPackages({
      savedObjectsClient,
      ...request.query,
    });

    const body: GetInstalledPackagesResponse = { ...res };

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getDataStreamsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetDataStreamsRequestSchema.query>
> = async (context, request, response) => {
  try {
    const coreContext = await context.core;
    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const res = await getDataStreams({
      esClient,
      ...request.query,
    });

    const body: GetEpmDataStreamsResponse = {
      ...res,
    };

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getLimitedListHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetLimitedPackagesRequestSchema.query>,
  undefined
> = async (context, request, response) => {
  try {
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const res = await getLimitedPackages({
      savedObjectsClient,
      prerelease: request.query.prerelease,
    });
    const body: GetLimitedPackagesResponse = {
      items: res,
      response: res,
    };
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getInfoHandler: FleetRequestHandler<
  TypeOf<typeof GetInfoRequestSchema.params>,
  TypeOf<typeof GetInfoRequestSchema.query>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const { limitedToPackages } = await context.fleet;
    const { pkgName, pkgVersion } = request.params;

    checkAllowedPackages([pkgName], limitedToPackages);

    const { ignoreUnverified = false, full = false, prerelease } = request.query;
    if (pkgVersion && !semverValid(pkgVersion)) {
      throw new FleetError('Package version is not a valid semver');
    }
    const res = await getPackageInfo({
      savedObjectsClient,
      pkgName,
      pkgVersion: pkgVersion || '',
      skipArchive: !full,
      ignoreUnverified,
      prerelease,
    });
    const flattenedRes = soToInstallationInfo(res) as PackageInfo;

    const body: GetInfoResponse = {
      item: flattenedRes,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getBulkAssetsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof GetBulkAssetsRequestSchema.body>
> = async (context, request, response) => {
  try {
    const { assetIds } = request.body;
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const assets = await getBulkAssets(savedObjectsClient, assetIds as AssetSOObject[]);

    const body: GetBulkAssetsResponse = {
      items: assets,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const updatePackageHandler: FleetRequestHandler<
  TypeOf<typeof UpdatePackageRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackageRequestSchema.body>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const { pkgName } = request.params;

    const res = await updatePackage({ savedObjectsClient, pkgName, ...request.body });
    const body: UpdatePackageResponse = {
      item: res,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getStatsHandler: FleetRequestHandler<
  TypeOf<typeof GetStatsRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgName } = request.params;
    const savedObjectsClient = (await context.fleet).internalSoClient;
    const body: GetStatsResponse = {
      response: await getPackageUsageStats({ savedObjectsClient, pkgName }),
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const installPackageFromRegistryHandler: FleetRequestHandler<
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.params>,
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.query>,
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;

  const { pkgName, pkgVersion } = request.params;

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);

  const spaceId = fleetContext.spaceId;
  const res = await installPackage({
    installSource: 'registry',
    savedObjectsClient,
    pkgkey: pkgVersion ? `${pkgName}-${pkgVersion}` : pkgName,
    esClient,
    spaceId,
    force: request.body?.force,
    ignoreConstraints: request.body?.ignore_constraints,
    prerelease: request.query?.prerelease,
    authorizationHeader,
    ignoreMappingUpdateErrors: request.query?.ignoreMappingUpdateErrors,
    skipDataStreamRollover: request.query?.skipDataStreamRollover,
  });

  if (!res.error) {
    const body: InstallPackageResponse = {
      items: res.assets || [],
      _meta: {
        install_source: res.installSource,
      },
    };
    return response.ok({ body });
  } else {
    return await defaultFleetErrorHandler({ error: res.error, response });
  }
};
export const createCustomIntegrationHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateCustomIntegrationRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const kibanaVersion = appContextService.getKibanaVersion();
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);
  const spaceId = fleetContext.spaceId;
  const { integrationName, force, datasets } = request.body;

  try {
    const res = await installPackage({
      installSource: 'custom',
      savedObjectsClient,
      pkgName: integrationName,
      datasets,
      esClient,
      spaceId,
      force,
      authorizationHeader,
      kibanaVersion,
    });

    if (!res.error) {
      const body: InstallPackageResponse = {
        items: res.assets || [],
        _meta: {
          install_source: res.installSource,
        },
      };
      return response.ok({ body });
    } else {
      return await defaultFleetErrorHandler({ error: res.error, response });
    }
  } catch (error) {
    if (error instanceof NamingCollisionError) {
      return response.customError({
        statusCode: 409,
        body: {
          message: error.message,
        },
      });
    } else if (error instanceof DatasetNamePrefixError) {
      return response.customError({
        statusCode: 422,
        body: {
          message: error.message,
        },
      });
    }
    return await defaultFleetErrorHandler({ error, response });
  }
};

const bulkInstallServiceResponseToHttpEntry = (
  result: BulkInstallResponse
): BulkInstallPackageInfo | IBulkInstallPackageHTTPError => {
  if (isBulkInstallError(result)) {
    const { statusCode, body } = fleetErrorToResponseOptions(result.error);
    return {
      name: result.name,
      statusCode,
      error: body.message,
    };
  } else {
    return result;
  }
};

export const bulkInstallPackagesFromRegistryHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof BulkInstallPackagesFromRegistryRequestSchema.query>,
  TypeOf<typeof BulkInstallPackagesFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const spaceId = fleetContext.spaceId;

  const bulkInstalledResponses = await bulkInstallPackages({
    savedObjectsClient,
    esClient,
    packagesToInstall: request.body.packages,
    spaceId,
    prerelease: request.query.prerelease,
    force: request.body.force,
  });
  const payload = bulkInstalledResponses.map(bulkInstallServiceResponseToHttpEntry);
  const body: BulkInstallPackagesResponse = {
    items: payload,
    response: payload,
  };
  return response.ok({ body });
};

export const installPackageByUploadHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof InstallPackageByUploadRequestSchema.query>,
  TypeOf<typeof InstallPackageByUploadRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const contentType = request.headers['content-type'] as string; // from types it could also be string[] or undefined but this is checked later
  const archiveBuffer = Buffer.from(request.body);
  const spaceId = fleetContext.spaceId;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);

  const res = await installPackage({
    installSource: 'upload',
    savedObjectsClient,
    esClient,
    archiveBuffer,
    spaceId,
    contentType,
    authorizationHeader,
    ignoreMappingUpdateErrors: request.query?.ignoreMappingUpdateErrors,
    skipDataStreamRollover: request.query?.skipDataStreamRollover,
  });
  if (!res.error) {
    const body: InstallPackageResponse = {
      items: res.assets || [],
      response: res.assets || [],
      _meta: {
        install_source: res.installSource,
      },
    };
    return response.ok({ body });
  } else {
    return defaultFleetErrorHandler({ error: res.error, response });
  }
};

export const deletePackageHandler: FleetRequestHandler<
  TypeOf<typeof DeletePackageRequestSchema.params>,
  TypeOf<typeof DeletePackageRequestSchema.query>,
  TypeOf<typeof DeletePackageRequestSchema.body>
> = async (context, request, response) => {
  try {
    const { pkgName, pkgVersion } = request.params;
    const coreContext = await context.core;
    const fleetContext = await context.fleet;
    const savedObjectsClient = fleetContext.internalSoClient;
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const res = await removeInstallation({
      savedObjectsClient,
      pkgName,
      pkgVersion,
      esClient,
      force: request.query?.force,
    });
    const body: DeletePackageResponse = {
      items: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getVerificationKeyIdHandler: FleetRequestHandler = async (
  context,
  request,
  response
) => {
  try {
    const packageVerificationKeyId = await getGpgKeyIdOrUndefined();
    const body: GetVerificationKeyIdResponse = {
      id: packageVerificationKeyId || null,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

/**
 * Create transform and optionally start transform
 * Note that we want to add the current user's roles/permissions to the es-secondary-auth with a API Key.
 * If API Key has insufficient permissions, it should still create the transforms but not start it
 * Instead of failing, we need to allow package to continue installing other assets
 * and prompt for users to authorize the transforms with the appropriate permissions after package is done installing
 */
export const reauthorizeTransformsHandler: FleetRequestHandler<
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.params>,
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.query>,
  TypeOf<typeof ReauthorizeTransformRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const savedObjectsClient = (await context.fleet).internalSoClient;

  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { pkgName, pkgVersion } = request.params;
  const { transforms } = request.body;

  let username;
  try {
    const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
    if (user) {
      username = user.username;
    }
  } catch (e) {
    // User might not have permission to get username, or security is not enabled, and that's okay.
  }

  try {
    const logger = appContextService.getLogger();
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, username);
    const secondaryAuth = await generateTransformSecondaryAuthHeaders({
      authorizationHeader,
      logger,
      username,
      pkgName,
      pkgVersion,
    });

    const resp = await handleTransformReauthorizeAndStart({
      esClient,
      savedObjectsClient,
      logger,
      pkgName,
      pkgVersion,
      transforms,
      secondaryAuth,
      username,
    });

    return response.ok({ body: resp });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getInputsHandler: FleetRequestHandler<
  TypeOf<typeof GetInputsRequestSchema.params>,
  TypeOf<typeof GetInputsRequestSchema.query>,
  undefined
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;

  try {
    const { pkgName, pkgVersion } = request.params;
    const { format } = request.query;
    let body;
    if (format === 'json') {
      body = await getTemplateInputs(soClient, pkgName, pkgVersion, 'json');
    } else if (format === 'yml' || format === 'yaml') {
      body = await getTemplateInputs(soClient, pkgName, pkgVersion, 'yml');
    }
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

// Don't expose the whole SO in the API response, only selected fields
const soToInstallationInfo = (pkg: PackageListItem | PackageInfo) => {
  if ('savedObject' in pkg && pkg.savedObject?.attributes) {
    const { attributes } = pkg.savedObject;
    const installationInfo: InstallationInfo = {
      ...pick(pkg.savedObject, ['created_at', 'updated_at', 'namespaces', 'type']),
      installed_kibana: attributes.installed_kibana,
      installed_kibana_space_id: attributes.installed_kibana_space_id,
      installed_es: attributes.installed_es,
      install_status: attributes.install_status,
      install_source: attributes.install_source,
      name: attributes.name,
      version: attributes.version,
      verification_status: attributes.verification_status,
      verification_key_id: attributes.verification_key_id,
      experimental_data_stream_features: attributes.experimental_data_stream_features,
      latest_install_failed_attempts: attributes.latest_install_failed_attempts,
    };

    return {
      // When savedObject gets removed, replace `pkg` with `...omit(pkg, 'savedObject')`
      ...pkg,
      installationInfo,
    };
  }
  return pkg;
};
