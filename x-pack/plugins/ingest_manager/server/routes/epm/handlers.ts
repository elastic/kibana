/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, CustomHttpResponseOptions } from 'kibana/server';
import { GetFileRequestSchema, GetInfoRequestSchema, EPM_API_ROOT } from '../../../common';
import {
  getCategories,
  getPackages,
  getFile,
  getPackageInfo,
} from '../../services/epm/packages/get';
import { GetPackagesRequestSchema } from '../../types';

export const getCategoriesHandler: RequestHandler = async (context, request, response) => {
  try {
    const res = await getCategories();
    return response.ok({
      body: {
        response: res,
        success: true,
      },
    });
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
    return response.ok({
      body: {
        response: res,
        success: true,
      },
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
    return response.ok({
      body: {
        response: res,
        success: true,
      },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
