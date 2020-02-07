/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, CustomHttpResponseOptions } from 'kibana/server';
import {
  GetCategoriesResponse,
  GetPackagesRequestSchema,
  GetPackagesResponse,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  GetInfoResponse,
  InstallPackageRequestSchema,
  InstallPackageResponse,
  DeletePackageRequestSchema,
  DeletePackageResponse,
  EPM_API_ROOT,
} from '../../../common';
import { appContextService } from '../../services';
import {
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
  installPackage,
  removeInstallation,
} from '../../services/epm/packages';
import { getClusterAccessor } from '../../services/epm/cluster_access';

export const getCategoriesHandler: RequestHandler = async (context, request, response) => {
  try {
    const res = await getCategories();
    const body: GetCategoriesResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
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
      category: request.query.category,
    });
    const body: GetPackagesResponse = {
      response: res,
      success: true,
    };
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getFileHandler: RequestHandler<TypeOf<typeof GetFileRequestSchema.params>> = async (
  context,
  request,
  response
) => {
  try {
    // checking for url.path, but maybe should use validated response.params to build the url:
    // `package/${response.params.pkgkey}/${response.params.filePath}`?
    if (!request.url.path) throw new Error('path is required');
    const reqPath = request.url.path.replace(EPM_API_ROOT, '');

    const registryResponse = await getFile(reqPath);
    const contentType = registryResponse.headers.get('Content-Type');
    const customResponseObj: CustomHttpResponseOptions<typeof registryResponse.body> = {
      body: registryResponse.body,
      statusCode: registryResponse.status,
    };
    if (contentType !== null) {
      customResponseObj.headers = { 'Content-Type': contentType };
    }
    return response.custom(customResponseObj);
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
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
    const res = await getPackageInfo({ savedObjectsClient, pkgkey });
    const body: GetInfoResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const installPackageHandler: RequestHandler<TypeOf<
  typeof InstallPackageRequestSchema.params
>> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    const res = await installPackage({
      savedObjectsClient,
      pkgkey,
    });
    const body: InstallPackageResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const deletePackageHandler: RequestHandler<TypeOf<
  typeof DeletePackageRequestSchema.params
>> = async (context, request, response) => {
  try {
    const { pkgkey } = request.params;
    const savedObjectsClient = context.core.savedObjects.client;
    const clusterClient = appContextService.getClusterClient();
    if (!clusterClient) throw new Error('there was a problem deleting the package');
    const callCluster = getClusterAccessor(clusterClient, request);
    const res = await removeInstallation({ savedObjectsClient, pkgkey, callCluster });
    const body: DeletePackageResponse = {
      response: res,
      success: true,
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
