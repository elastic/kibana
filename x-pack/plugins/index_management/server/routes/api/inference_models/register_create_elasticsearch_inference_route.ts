/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '..';
import { RouteDependencies } from '../../../types';

export function registerCreateElasticsearchInferenceRoute({
  router,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const paramsSchema = schema.object({
    inferenceId: schema.string(),
  });
  const bodySchema = schema.object({
    trainedModelId: schema.string(),
  });
  // Create text_embedding inference
  router.post(
    {
      path: addBasePath('/inference/text_embedding/{inferenceId}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (context, request, response) => {
      const { inferenceId } = request.params;
      const { trainedModelId } = request.body;
      const { client } = (await context.core).elasticsearch;

      // TODO: Use the client's built-in function rather than the transport when it's available
      try {
        await client.asCurrentUser.transport.request({
          body: {
            service: 'elasticsearch',
            service_settings: {
              num_allocations: 1,
              num_threads: 1,
              model_id: trainedModelId,
            },
          },
          method: 'PUT',
          path: `/_inference/text_embedding/${inferenceId}`,
        });

        return response.ok({
          body: { sucess: true },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
