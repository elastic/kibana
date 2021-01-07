/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import mime from 'mime-types';
import path from 'path';
import { RequestHandler, ResponseHeaders, KnownHeaders } from 'src/core/server';
import {
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
} from '../../../common';
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
import {
  BulkInstallResponse,
  bulkInstallPackages,
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
  handleInstallPackageFailure,
  isBulkInstallError,
  installPackage,
  removeInstallation,
  getLimitedPackages,
  getInstallationObject,
  getInstallation,
} from '../../services/epm/packages';
import { defaultIngestErrorHandler, ingestErrorToResponseOptions } from '../../errors';
import { splitPkgKey } from '../../services/epm/registry';
import { licenseService } from '../../services';
import { getArchiveEntry } from '../../services/epm/archive/cache';
import { getAsset } from '../../services/epm/archive/storage';
import { getPackageUsageStats } from '../../services/epm/packages/get';

export const getCategoriesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetCategoriesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const res = await getCategories(request.query);
    const body: GetCategoriesResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getListHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetPackagesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = context.core.savedObjects.client;
    const res = await getPackages({
      savedObjectsClient,
      ...request.query,
    });
    const body: GetPackagesResponse = {
      response: res,
    };
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getLimitedListHandler: RequestHandler = async (context, request, response) => {
  try {
    const savedObjectsClient = context.core.savedObjects.client;
    const res = await getLimitedPackages({ savedObjectsClient });
    const body: GetLimitedPackagesResponse = {
      response: res,
    };
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getFileHandler: RequestHandler<TypeOf<typeof GetFileRequestSchema.params>> = async (
  context,
  request,
  response
) => {
  try {
    const { pkgName, pkgVersion, filePath } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    const installation = await getInstallation({ savedObjectsClient, pkgName });
    const useLocalFile = pkgVersion === installation?.version;

    if (useLocalFile) {
      const assetPath = `${pkgName}-${pkgVersion}/${filePath}`;
      const fileBuffer = getArchiveEntry(assetPath);
      // only pull local installation if we don't have it cached
      const storedAsset = !fileBuffer && (await getAsset({ savedObjectsClient, path: assetPath }));

      // error, if neither is available
      if (!fileBuffer && !storedAsset) {
        return response.custom({
          body: `installed package file not found: ${filePath}`,
          statusCode: 404,
        });
      }

      // if storedAsset is not available, fileBuffer *must* be
      // b/c we error if we don't have at least one, and storedAsset is the least likely
      const { buffer, contentType } = storedAsset
        ? {
            contentType: storedAsset.media_type,
            buffer: storedAsset.data_utf8
              ? Buffer.from(storedAsset.data_utf8, 'utf8')
              : Buffer.from(storedAsset.data_base64, 'base64'),
          }
        : {
            contentType: mime.contentType(path.extname(assetPath)),
            buffer: fileBuffer,
          };

      if (!contentType) {
        return response.custom({
          body: `unknown content type for file: ${filePath}`,
          statusCode: 400,
        });
      }

      return response.custom({
        body: buffer,
        statusCode: 200,
        headers: {
          'cache-control': 'max-age=10, public',
          'content-type': contentType,
        },
      });
    } else {
      const registryResponse = await getFile(pkgName, pkgVersion, filePath);
      const headersToProxy: KnownHeaders[] = ['content-type', 'cache-control'];
      const proxiedHeaders = headersToProxy.reduce((headers, knownHeader) => {
        const value = registryResponse.headers.get(knownHeader);
        if (value !== null) {
          headers[knownHeader] = value;
        }
        return headers;
      }, {} as ResponseHeaders);

      return response.custom({
        body: registryResponse.body,
        statusCode: registryResponse.status,
        headers: proxiedHeaders,
      });
    }
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getInfoHandler: RequestHandler<TypeOf<typeof GetInfoRequestSchema.params>> = async (
  context,
  request,
  response
) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    // TODO: change epm API to /packageName/version so we don't need to do this
    const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
    const res = await getPackageInfo({ savedObjectsClient, pkgName, pkgVersion });
    const body: GetInfoResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getStatsHandler: RequestHandler<TypeOf<typeof GetStatsRequestSchema.params>> = async (
  context,
  request,
  response
) => {
  try {
    const { pkgName } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    const body: GetStatsResponse = {
      response: await getPackageUsageStats({ savedObjectsClient, pkgName }),
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const installPackageFromRegistryHandler: RequestHandler<
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.params>,
  undefined,
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const savedObjectsClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const { pkgkey } = request.params;
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  try {
    const res = await installPackage({
      installSource: 'registry',
      savedObjectsClient,
      pkgkey,
      callCluster,
      force: request.body?.force,
    });
    const body: InstallPackageResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (e) {
    const defaultResult = await defaultIngestErrorHandler({ error: e, response });
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: e,
      pkgName,
      pkgVersion,
      installedPkg,
      callCluster,
    });

    return defaultResult;
  }
};

const bulkInstallServiceResponseToHttpEntry = (
  result: BulkInstallResponse
): BulkInstallPackageInfo | IBulkInstallPackageHTTPError => {
  if (isBulkInstallError(result)) {
    const { statusCode, body } = ingestErrorToResponseOptions(result.error);
    return {
      name: result.name,
      statusCode,
      error: body.message,
    };
  } else {
    return result;
  }
};

export const bulkInstallPackagesFromRegistryHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradePackagesFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const savedObjectsClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const bulkInstalledResponses = await bulkInstallPackages({
    savedObjectsClient,
    callCluster,
    packagesToUpgrade: request.body.packages,
  });
  const payload = bulkInstalledResponses.map(bulkInstallServiceResponseToHttpEntry);
  const body: BulkInstallPackagesResponse = {
    response: payload,
  };
  return response.ok({ body });
};

export const installPackageByUploadHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof InstallPackageByUploadRequestSchema.body>
> = async (context, request, response) => {
  if (!licenseService.isEnterprise()) {
    return response.customError({
      statusCode: 403,
      body: { message: 'Requires Enterprise license' },
    });
  }
  const savedObjectsClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const contentType = request.headers['content-type'] as string; // from types it could also be string[] or undefined but this is checked later
  const archiveBuffer = Buffer.from(request.body);
  try {
    const res = await installPackage({
      installSource: 'upload',
      savedObjectsClient,
      callCluster,
      archiveBuffer,
      contentType,
    });
    const body: InstallPackageResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deletePackageHandler: RequestHandler<
  TypeOf<typeof DeletePackageRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
    const res = await removeInstallation({ savedObjectsClient, pkgkey, callCluster });
    const body: DeletePackageResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
