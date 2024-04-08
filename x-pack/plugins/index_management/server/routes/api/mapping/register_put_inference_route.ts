/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import {
  InferenceTaskType,
  InferenceModelConfig,
  InferencePutModelResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
const paramsSchema = schema.object({
  taskType: schema.string(),
  inferenceId: schema.string(),
});
export function registerPUTInferenceModel({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/inference/{taskType}/{inferenceId}'),
      validate: {
        body: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { taskType } = request.params as typeof paramsSchema.type;
      const { inferenceId } = request.params as typeof paramsSchema.type;

      try {
        const responseBody: InferencePutModelResponse =
          await client.asCurrentUser.inference.putModel({
            task_type: taskType as InferenceTaskType,
            model_id: inferenceId,
            model_config: request.body as InferenceModelConfig,
          });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
