/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { GetOneOutputRequestSchema, PutOutputRequestSchema } from '../../types';
import { GetOneOutputResponse, GetOutputsResponse } from '../../../common';
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

export const getOneOuputHandler: RequestHandler<
  TypeOf<typeof GetOneOutputRequestSchema.params>
> = async (context, request, response) => {
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
