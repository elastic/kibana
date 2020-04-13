/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, CustomHttpResponseOptions } from 'src/core/server';
import {
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  InstallPackageRequestSchema,
  DeletePackageRequestSchema,
} from '../../types';
import {
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageResponse,
  GetCategoriesResponse,
  GetPackagesResponse,
} from '../../../common';
import {
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
  installPackage,
  removeInstallation,
} from '../../services/epm/packages';

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
    // TODO: change epm API to /packageName/version so we don't need to do this
    const [pkgName, pkgVersion] = pkgkey.split('-');
    const res = await getPackageInfo({ savedObjectsClient, pkgName, pkgVersion });
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
    const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
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
    const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
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
