/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, CustomHttpResponseOptions } from 'src/core/server';
import {
  GetInfoResponse,
  InstallPackageResponse,
  MessageResponse,
  DeletePackageResponse,
  GetCategoriesResponse,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
  BulkInstallPackagesResponse,
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
} from '../../types';
import {
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
  installPackage,
  removeInstallation,
  getLimitedPackages,
  getInstallationObject,
} from '../../services/epm/packages';
import { defaultIngestErrorHandler } from '../../errors';
import { splitPkgKey } from '../../services/epm/registry';
import {
  handleInstallPackageFailure,
  bulkInstallPackages,
} from '../../services/epm/packages/install';

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
    const registryResponse = await getFile(`/package/${pkgName}/${pkgVersion}/${filePath}`);
    const contentType = registryResponse.headers.get('Content-Type');
    const customResponseObj: CustomHttpResponseOptions<typeof registryResponse.body> = {
      body: registryResponse.body,
      statusCode: registryResponse.status,
    };
    if (contentType !== null) {
      customResponseObj.headers = { 'Content-Type': contentType };
    }
    return response.custom(customResponseObj);
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

export const bulkInstallPackagesFromRegistryHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradePackagesFromRegistryRequestSchema.body>
> = async (context, request, response) => {
  const savedObjectsClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const res = await bulkInstallPackages({
    savedObjectsClient,
    callCluster,
    packagesToUpgrade: request.body.packages,
  });
  const body: BulkInstallPackagesResponse = {
    response: res,
  };
  return response.ok({ body });
};

export const installPackageByUploadHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof InstallPackageByUploadRequestSchema.body>
> = async (context, request, response) => {
  const body: MessageResponse = {
    response: 'package upload was received ok, but not installed (not implemented yet)',
  };
  return response.ok({ body });
};

export const deletePackageHandler: RequestHandler<TypeOf<
  typeof DeletePackageRequestSchema.params
>> = async (context, request, response) => {
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
