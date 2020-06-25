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
  NewDatasource,
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
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const logger = appContextService.getLogger();
  let newData = { ...request.body };
  try {
    // If we have external callbacks, then process those now before creating the actual datasource
    const externalCallbacks = appContextService.getExternalCallbacks('datasourceCreate');
    if (externalCallbacks && externalCallbacks.size > 0) {
      let updatedNewData: NewDatasource = newData;

      for (const callback of externalCallbacks) {
        try {
          // ensure that the returned value by the callback passes schema validation
          updatedNewData = CreateDatasourceRequestSchema.body.validate(
            await callback(updatedNewData)
          );
        } catch (error) {
          // Log the error, but keep going and process the other callbacks
          logger.error('An external registered [datasourceCreate] callback failed when executed');
          logger.error(error);
        }
      }

      // The type `NewDatasource` and the `DatasourceBaseSchema` are incompatible.
      // `NewDatasrouce` defines `namespace` as optional string, which means that `undefined` is a
      // valid value, however, the schema defines it as string with a minimum length of 1.
      // Here, we need to cast the value back to the schema type and ignore the TS error.
      // @ts-ignore
      newData = updatedNewData as typeof CreateDatasourceRequestSchema.body;
    }

    // Make sure the datasource package is installed
    if (newData.package?.name) {
      await ensureInstalledPackage({
        savedObjectsClient: soClient,
        pkgName: newData.package.name,
        callCluster,
      });
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: newData.package.name,
        pkgVersion: newData.package.version,
      });
      newData.inputs = (await datasourceService.assignPackageStream(
        pkgInfo,
        newData.inputs
      )) as TypeOf<typeof CreateDatasourceRequestSchema.body>['inputs'];
    }

    // Create datasource
    const datasource = await datasourceService.create(soClient, newData, { user });
    const body: CreateDatasourceResponse = { item: datasource, success: true };
    return response.ok({
      body,
    });
  } catch (e) {
    logger.error(e);
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
