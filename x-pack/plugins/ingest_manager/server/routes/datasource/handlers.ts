/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { datasourceService } from '../../services';
import {
  GetDatasourcesRequestSchema,
  GetOneDatasourceRequestSchema,
  CreateDatasourceRequestSchema,
  UpdateDatasourceRequestSchema,
  DeleteDatasourcesRequestSchema,
  DeleteDatasourcesResponse,
} from '../../types';

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
  try {
    const datasource = await datasourceService.create(soClient, request.body);
    return response.ok({
      body: { item: datasource, success: true },
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
  try {
    const datasource = await datasourceService.update(
      soClient,
      request.params.datasourceId,
      request.body
    );
    return response.ok({
      body: { item: datasource, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const deleteDatasourcesHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteDatasourcesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const body: DeleteDatasourcesResponse = await datasourceService.delete(
      soClient,
      request.body.datasourceIds
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
