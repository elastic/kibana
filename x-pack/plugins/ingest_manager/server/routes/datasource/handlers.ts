/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import Boom from 'boom';
import { RequestHandler } from 'src/core/server';
import { appContextService, datasourceService } from '../../services';
import { ensureInstalledPackage, getPackageInfo } from '../../services/epm/packages';
import {
  GetDatasourcesRequestSchema,
  GetOneDatasourceRequestSchema,
  CreateDatasourceRequestSchema,
  UpdateDatasourceRequestSchema,
  DeleteDatasourcesRequestSchema,
} from '../../types';
import { CreateDatasourceResponse, DeleteDatasourcesResponse } from '../../../common';

export const getDatasourcesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetDatasourcesRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await datasourceService.list(soClient, request.query);
    return response.ok({
      body: {
        items,
        total,
        page,
        perPage,
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

export const getOneDatasourceHandler: RequestHandler<TypeOf<
  typeof GetOneDatasourceRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const datasource = await datasourceService.get(soClient, request.params.datasourceId);
    if (datasource) {
      return response.ok({
        body: {
          item: datasource,
          success: true,
        },
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Datasource not found' },
      });
    }
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const createDatasourceHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateDatasourceRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const newData = { ...request.body };
  try {
    // Make sure the datasource package is installed
    if (request.body.package?.name) {
      await ensureInstalledPackage({
        savedObjectsClient: soClient,
        pkgName: request.body.package.name,
        callCluster,
      });
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: request.body.package.name,
        pkgVersion: request.body.package.version,
      });
      newData.inputs = (await datasourceService.assignPackageStream(
        pkgInfo,
        request.body.inputs
      )) as TypeOf<typeof CreateDatasourceRequestSchema.body>['inputs'];
    }

    // Create datasource
    const datasource = await datasourceService.create(soClient, newData, { user });
    const body: CreateDatasourceResponse = { item: datasource, success: true };
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

export const updateDatasourceHandler: RequestHandler<
  TypeOf<typeof UpdateDatasourceRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateDatasourceRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const datasource = await datasourceService.get(soClient, request.params.datasourceId);

    if (!datasource) {
      throw Boom.notFound('Datasource not found');
    }

    const newData = { ...request.body };
    const pkg = newData.package || datasource.package;
    const inputs = newData.inputs || datasource.inputs;
    if (pkg && (newData.inputs || newData.package)) {
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
      });
      newData.inputs = (await datasourceService.assignPackageStream(pkgInfo, inputs)) as TypeOf<
        typeof CreateDatasourceRequestSchema.body
      >['inputs'];
    }

    const updatedDatasource = await datasourceService.update(
      soClient,
      request.params.datasourceId,
      newData,
      { user }
    );
    return response.ok({
      body: { item: updatedDatasource, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const deleteDatasourceHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteDatasourcesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const body: DeleteDatasourcesResponse = await datasourceService.delete(
      soClient,
      request.body.datasourceIds,
      { user }
    );
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
