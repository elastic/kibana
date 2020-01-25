/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { dataStreamService } from '../../services';
import {
  GetDataStreamsRequestSchema,
  GetOneDataStreamRequestSchema,
  CreateDataStreamRequestSchema,
  UpdateDataStreamRequestSchema,
} from '../../types';

export const getDataStreamsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetDataStreamsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await dataStreamService.list(soClient, request.query);
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

export const getOneDataStreamHandler: RequestHandler<TypeOf<
  typeof GetOneDataStreamRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const dataStream = await dataStreamService.get(soClient, request.params.dataStreamId);
    if (dataStream) {
      return response.ok({
        body: {
          item: dataStream,
          success: true,
        },
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Data stream not found' },
      });
    }
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const createDataStreamHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateDataStreamRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const dataStream = await dataStreamService.create(soClient, request.body);
    return response.ok({
      body: { item: dataStream, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const updateDataStreamHandler: RequestHandler<
  TypeOf<typeof UpdateDataStreamRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateDataStreamRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const dataStream = await dataStreamService.update(
      soClient,
      request.params.dataStreamId,
      request.body
    );
    return response.ok({
      body: { item: dataStream, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
