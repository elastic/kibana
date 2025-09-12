/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import type { TypeOf } from '@kbn/config-schema';
import mime from 'mime-types';
import type { ResponseHeaders, KnownHeaders } from 'src/core/server';

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
} from '../../../common';
import type {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  BulkUpgradePackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
  FleetRequestHandler,
  UpdatePackageRequestSchema,
} from '../../types';
import {
  bulkInstallPackages,
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
  isBulkInstallError,
  installPackage,
  removeInstallation,
  getLimitedPackages,
  getInstallation,
} from '../../services/epm/packages';
import type { BulkInstallResponse } from '../../services/epm/packages';
import {
  defaultIngestErrorHandler,
  ingestErrorToResponseOptions,
  IngestManagerError,
} from '../../errors';
import { splitPkgKey } from '../../services/epm/registry';
import { licenseService } from '../../services';
import { getArchiveEntry } from '../../services/epm/archive/cache';
import { getAsset } from '../../services/epm/archive/storage';
import { getPackageUsageStats } from '../../services/epm/packages/get';
import { updatePackage } from '../../services/epm/packages/update';

const ALLOWED_MIME_TYPES = [
  'image/svg+xml',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/json',
  'application/yaml',
  'text/plain',
  'text/markdown',
  'text/yaml',
];

function validateContentTypeIsAllowed(contentType: string) {
  if (!ALLOWED_MIME_TYPES.includes(contentType.split(';')[0])) {
    throw new IngestManagerError(
      `File content type "${contentType}" is not allowed to be retrieved`,
      400
    );
  }
}

export const getCategoriesHandler: FleetRequestHandler<
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

export const getListHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetPackagesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const savedObjectsClient = context.fleet.epm.internalSoClient;
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

export const getLimitedListHandler: FleetRequestHandler = async (context, request, response) => {
  try {
    const savedObjectsClient = context.fleet.epm.internalSoClient;
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

export const getFileHandler: FleetRequestHandler<
  TypeOf<typeof GetFileRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgName, pkgVersion, filePath } = request.params;
    const savedObjectsClient = context.fleet.epm.internalSoClient;
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
      validateContentTypeIsAllowed(contentType);

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

      if (!proxiedHeaders['content-type'] || typeof proxiedHeaders['content-type'] !== 'string') {
        throw new IngestManagerError(`unknown content type for file: ${filePath}`);
      }
      validateContentTypeIsAllowed(proxiedHeaders['content-type']);

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

export const getInfoHandler: FleetRequestHandler<
  TypeOf<typeof GetInfoRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.fleet.epm.internalSoClient;
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

export const updatePackageHandler: FleetRequestHandler<
  TypeOf<typeof UpdatePackageRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackageRequestSchema.body>
> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.fleet.epm.internalSoClient;

    const { pkgName } = splitPkgKey(pkgkey);

    const res = await updatePackage({ savedObjectsClient, pkgName, ...request.body });
    const body: UpdatePackageResponse = {
      response: res,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getStatsHandler: FleetRequestHandler<
  TypeOf<typeof GetStatsRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgName } = request.params;
    const savedObjectsClient = context.fleet.epm.internalSoClient;
    const body: GetStatsResponse = {
      response: await getPackageUsageStats({ savedObjectsClient, pkgName }),
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const installPackageFromRegistryHandler: FleetRequestHandler<
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.params>,
  undefined,
  TypeOf<typeof InstallPackageFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const savedObjectsClient = context.fleet.epm.internalSoClient;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const { pkgkey } = request.params;

  const res = await installPackage({
    installSource: 'registry',
    savedObjectsClient,
    pkgkey,
    esClient,
    force: request.body?.force,
  });
  if (!res.error) {
    const body: InstallPackageResponse = {
      response: res.assets || [],
    };
    return response.ok({ body });
  } else {
    return await defaultIngestErrorHandler({ error: res.error, response });
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

export const bulkInstallPackagesFromRegistryHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradePackagesFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const savedObjectsClient = context.fleet.epm.internalSoClient;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const bulkInstalledResponses = await bulkInstallPackages({
    savedObjectsClient,
    esClient,
    packagesToInstall: request.body.packages,
  });
  const payload = bulkInstalledResponses.map(bulkInstallServiceResponseToHttpEntry);
  const body: BulkInstallPackagesResponse = {
    response: payload,
  };
  return response.ok({ body });
};

export const installPackageByUploadHandler: FleetRequestHandler<
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
  const savedObjectsClient = context.fleet.epm.internalSoClient;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const contentType = request.headers['content-type'] as string; // from types it could also be string[] or undefined but this is checked later
  const archiveBuffer = Buffer.from(request.body);

  const res = await installPackage({
    installSource: 'upload',
    savedObjectsClient,
    esClient,
    archiveBuffer,
    contentType,
  });
  if (!res.error) {
    const body: InstallPackageResponse = {
      response: res.assets || [],
    };
    return response.ok({ body });
  } else {
    return defaultIngestErrorHandler({ error: res.error, response });
  }
};

export const deletePackageHandler: FleetRequestHandler<
  TypeOf<typeof DeletePackageRequestSchema.params>,
  undefined,
  TypeOf<typeof DeletePackageRequestSchema.body>
> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.fleet.epm.internalSoClient;
    const esClient = context.core.elasticsearch.client.asInternalUser;
    const res = await removeInstallation({
      savedObjectsClient,
      pkgkey,
      esClient,
      force: request.body?.force,
    });
    const body: DeletePackageResponse = {
      response: res,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
