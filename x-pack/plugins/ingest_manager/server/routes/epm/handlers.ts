/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, CustomHttpResponseOptions } from 'src/core/server';
import { appContextService } from '../../services';
import {
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageResponse,
  GetCategoriesResponse,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
} from '../../../common';
import {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  InstallPackageRequestSchema,
  DeletePackageRequestSchema,
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
import { IngestManagerError, defaultIngestErrorHandler } from '../../errors';

export const getCategoriesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetCategoriesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const res = await getCategories(request.query);
    const body: GetCategoriesResponse = {
      response: res,
      success: true,
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
      success: true,
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
      success: true,
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
    const [pkgName, pkgVersion] = pkgkey.split('-');
    const res = await getPackageInfo({ savedObjectsClient, pkgName, pkgVersion });
    const body: GetInfoResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const installPackageHandler: RequestHandler<TypeOf<
  typeof InstallPackageRequestSchema.params
>> = async (context, request, response) => {
  const logger = appContextService.getLogger();
  const savedObjectsClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const { pkgkey } = request.params;
  const [pkgName, pkgVersion] = pkgkey.split('-');
  try {
    const res = await installPackage({
      savedObjectsClient,
      pkgkey,
      callCluster,
    });
    const body: InstallPackageResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (e) {
    // could have also done `return defaultIngestErrorHandler({ error: e, response })` at each of the returns,
    // but doing it this way will log the outer/install errors before any inner/rollback errors
    const defaultResult = await defaultIngestErrorHandler({ error: e, response });
    if (e instanceof IngestManagerError) {
      return defaultResult;
    }
    // if there is an unknown server error, uninstall any package assets
    try {
      const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
      const isUpdate = installedPkg && installedPkg.attributes.version < pkgVersion ? true : false;
      // if this is a failed install, remove any assets installed
      if (!isUpdate) {
        await removeInstallation({ savedObjectsClient, pkgkey, callCluster });
      }
    } catch (error) {
      logger.error(`could not remove assets from failed installation attempt for ${pkgkey}`);
    }
    return defaultResult;
  }
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
      success: true,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
