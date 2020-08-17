/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import { modelIdSchema, optionalModelIdSchema } from './schemas/inference_schema';

export function inferenceRoutes({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup Inference
   *
   * @api {get} /api/ml/inference/:modelId Get info of a trained inference model
   * @apiName GetInferenceModel
   * @apiDescription Retrieves configuration information for a trained inference model.
   */
  router.get(
    {
      path: '/api/ml/inference/{modelId?}',
      validate: {
        params: optionalModelIdSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { modelId } = request.params;
        const { body } = await client.asInternalUser.ml.getTrainedModels({
          ...(modelId ? { model_id: modelId } : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Inference
   *
   * @api {get} /api/ml/inference/:modelId/_stats Get stats of a trained inference model
   * @apiName GetInferenceModelStats
   * @apiDescription Retrieves usage information for trained inference models.
   */
  router.get(
    {
      path: '/api/ml/inference/{modelId}/_stats',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { modelId } = request.params;
        const { body } = await client.asInternalUser.ml.getTrainedModelsStats({
          ...(modelId ? { model_id: modelId } : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Inference
   *
   * @api {get} /api/ml/inference/:modelId/pipelines Get model pipelines
   * @apiName GetModelPipelines
   * @apiDescription Retrieves pipelines associated with a model
   */
  router.get(
    {
      path: '/api/ml/inference/{modelId}/pipelines',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { modelId } = request.params;

        const modelIdsMap = new Map<string, Record<string, any>>(
          modelId.split(',').map((id: string) => [id, {}])
        );

        const { body } = await client.asCurrentUser.ingest.getPipeline();

        for (const [pipelineName, pipelineDefinition] of Object.entries(body)) {
          const { processors } = pipelineDefinition as { processors: Array<Record<string, any>> };

          for (const processor of processors) {
            const id = processor.inference?.model_id;
            const obj = modelIdsMap.get(id);
            if (obj) {
              obj[pipelineName] = pipelineDefinition;
            }
          }
        }

        return response.ok({
          body: [...modelIdsMap.entries()].map(([id, pipelines]) => ({ model_id: id, pipelines })),
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Inference
   *
   * @api {delete} /api/ml/inference/:modelId Get stats of a trained inference model
   * @apiName DeleteInferenceModel
   * @apiDescription Deletes an existing trained inference model that is currently not referenced by an ingest pipeline.
   */
  router.delete(
    {
      path: '/api/ml/inference/{modelId}',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canDeleteDataFrameAnalytics'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { modelId } = request.params;
        const { body } = await client.asInternalUser.ml.deleteTrainedModel({
          model_id: modelId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
