/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { schema } from '@kbn/config-schema';
import type { InferenceModelConfig, InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { RouteInitialization } from '../types';
import { createInferenceSchema } from './schemas/inference_schema';
import { modelsProvider } from '../models/model_management';
import { wrapError } from '../client/error_wrapper';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { syncSavedObjectsFactory } from '../saved_objects';

export function inferenceModelRoutes(
  { router, routeGuard }: RouteInitialization,
  cloud: CloudSetup
) {
  /**
   * @apiGroup TrainedModels
   *
   * @api {put} /internal/ml/_inference/:taskType/:inferenceId Create Inference Endpoint
   * @apiName CreateInferenceEndpoint
   * @apiDescription Create Inference Endpoint
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/_inference/{taskType}/{inferenceId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateInferenceEndpoint'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: createInferenceSchema,
            body: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { inferenceId, taskType } = request.params;
            const body = await modelsProvider(client, mlClient, cloud).createInferenceEndpoint(
              inferenceId,
              taskType as InferenceTaskType,
              request.body as InferenceModelConfig
            );
            const { syncSavedObjects } = syncSavedObjectsFactory(client, mlSavedObjectService);
            await syncSavedObjects(false);
            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );
}
