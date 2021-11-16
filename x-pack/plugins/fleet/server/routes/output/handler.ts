/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  DeleteOutputRequestSchema,
  GetOneOutputRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';
import type {
  DeleteOutputResponse,
  GetOneOutputResponse,
  GetOutputsResponse,
} from '../../../common';
import { outputService } from '../../services/output';
import { defaultIngestErrorHandler } from '../../errors';

export const getOutputsHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const outputs = await outputService.list(soClient);

    const body: GetOutputsResponse = {
      items: outputs.items,
      page: outputs.page,
      perPage: outputs.perPage,
      total: outputs.total,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOneOuputHandler: RequestHandler<TypeOf<typeof GetOneOutputRequestSchema.params>> =
  async (context, request, response) => {
    const soClient = context.core.savedObjects.client;
    try {
      const output = await outputService.get(soClient, request.params.outputId);

      const body: GetOneOutputResponse = {
        item: output,
      };

      return response.ok({ body });
    } catch (error) {
      if (error.isBoom && error.output.statusCode === 404) {
        return response.notFound({
          body: { message: `Output ${request.params.outputId} not found` },
        });
      }

      return defaultIngestErrorHandler({ error, response });
    }
  };

export const putOuputHandler: RequestHandler<
  TypeOf<typeof PutOutputRequestSchema.params>,
  undefined,
  TypeOf<typeof PutOutputRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await outputService.update(soClient, request.params.outputId, request.body);
    const output = await outputService.get(soClient, request.params.outputId);

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const postOuputHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostOutputRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { id, ...data } = request.body;
    const output = await outputService.create(soClient, data, { id });

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteOutputHandler: RequestHandler<TypeOf<typeof DeleteOutputRequestSchema.params>> =
  async (context, request, response) => {
    const soClient = context.core.savedObjects.client;
    try {
      await outputService.delete(soClient, request.params.outputId);

      const body: DeleteOutputResponse = {
        id: request.params.outputId,
      };

      return response.ok({ body });
    } catch (error) {
      if (error.isBoom && error.output.statusCode === 404) {
        return response.notFound({
          body: { message: `Output ${request.params.outputId} not found` },
        });
      }

      return defaultIngestErrorHandler({ error, response });
    }
  };
