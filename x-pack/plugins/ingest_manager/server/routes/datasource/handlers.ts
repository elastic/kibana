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
  GetPackageConfigsRequestSchema,
  GetOnePackageConfigRequestSchema,
  CreatePackageConfigRequestSchema,
  UpdatePackageConfigRequestSchema,
  DeletePackageConfigsRequestSchema,
  NewPackageConfig,
} from '../../types';
import { CreatePackageConfigResponse, DeletePackageConfigsResponse } from '../../../common';

export const getDatasourcesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetPackageConfigsRequestSchema.query>
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
  typeof GetOnePackageConfigRequestSchema.params
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
  TypeOf<typeof CreatePackageConfigRequestSchema.body>
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
      let updatedNewData: NewPackageConfig = newData;

      for (const callback of externalCallbacks) {
        try {
          // ensure that the returned value by the callback passes schema validation
          updatedNewData = CreatePackageConfigRequestSchema.body.validate(
            await callback(updatedNewData)
          );
        } catch (error) {
          // Log the error, but keep going and process the other callbacks
          logger.error('An external registered [datasourceCreate] callback failed when executed');
          logger.error(error);
        }
      }

      newData = updatedNewData;
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
      )) as TypeOf<typeof CreatePackageConfigRequestSchema.body>['inputs'];
    }

    // Create datasource
    const datasource = await datasourceService.create(soClient, newData, { user });
    const body: CreatePackageConfigResponse = { item: datasource, success: true };
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
  TypeOf<typeof UpdatePackageConfigRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackageConfigRequestSchema.body>
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
        typeof CreatePackageConfigRequestSchema.body
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
  TypeOf<typeof DeletePackageConfigsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const body: DeletePackageConfigsResponse = await datasourceService.delete(
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
