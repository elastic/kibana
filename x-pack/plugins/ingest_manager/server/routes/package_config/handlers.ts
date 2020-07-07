/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import Boom from 'boom';
import { RequestHandler } from 'src/core/server';
import { appContextService, packageConfigService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages';
import {
  GetPackageConfigsRequestSchema,
  GetOnePackageConfigRequestSchema,
  CreatePackageConfigRequestSchema,
  UpdatePackageConfigRequestSchema,
  DeletePackageConfigsRequestSchema,
  NewPackageConfig,
} from '../../types';
import { CreatePackageConfigResponse, DeletePackageConfigsResponse } from '../../../common';

export const getPackageConfigsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetPackageConfigsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await packageConfigService.list(
      soClient,
      request.query
    );
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

export const getOnePackageConfigHandler: RequestHandler<TypeOf<
  typeof GetOnePackageConfigRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const packageConfig = await packageConfigService.get(soClient, request.params.packageConfigId);
    if (packageConfig) {
      return response.ok({
        body: {
          item: packageConfig,
          success: true,
        },
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Package config not found' },
      });
    }
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const createPackageConfigHandler: RequestHandler<
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
    // If we have external callbacks, then process those now before creating the actual package config
    const externalCallbacks = appContextService.getExternalCallbacks('packageConfigCreate');
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
          logger.error(
            'An external registered [packageConfigCreate] callback failed when executed'
          );
          logger.error(error);
        }
      }

      newData = updatedNewData;
    }

    // Create package config
    const packageConfig = await packageConfigService.create(soClient, callCluster, newData, {
      user,
    });
    const body: CreatePackageConfigResponse = { item: packageConfig, success: true };
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

export const updatePackageConfigHandler: RequestHandler<
  TypeOf<typeof UpdatePackageConfigRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackageConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const packageConfig = await packageConfigService.get(soClient, request.params.packageConfigId);

    if (!packageConfig) {
      throw Boom.notFound('Package config not found');
    }

    const newData = { ...request.body };
    const pkg = newData.package || packageConfig.package;
    const inputs = newData.inputs || packageConfig.inputs;
    if (pkg && (newData.inputs || newData.package)) {
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
      });
      newData.inputs = (await packageConfigService.assignPackageStream(pkgInfo, inputs)) as TypeOf<
        typeof CreatePackageConfigRequestSchema.body
      >['inputs'];
    }

    const updatedPackageConfig = await packageConfigService.update(
      soClient,
      request.params.packageConfigId,
      newData,
      { user }
    );
    return response.ok({
      body: { item: updatedPackageConfig, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: e.statusCode || 500,
      body: { message: e.message },
    });
  }
};

export const deletePackageConfigHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeletePackageConfigsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const body: DeletePackageConfigsResponse = await packageConfigService.delete(
      soClient,
      request.body.packageConfigIds,
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
