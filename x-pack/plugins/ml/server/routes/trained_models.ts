/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ErrorType } from '@kbn/ml-error-utils';
import { type MlGetTrainedModelsRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import {
  deleteTrainedModelQuerySchema,
  getInferenceQuerySchema,
  inferTrainedModelBody,
  inferTrainedModelQuery,
  modelAndDeploymentIdSchema,
  modelIdSchema,
  optionalModelIdSchema,
  pipelineSimulateBody,
  putTrainedModelQuerySchema,
  threadingParamsSchema,
  updateDeploymentParamsSchema,
  createIngestPipelineSchema,
} from './schemas/inference_schema';
import { TrainedModelConfigResponse } from '../../common/types/trained_models';
import { mlLog } from '../lib/log';
import { forceQuerySchema } from './schemas/anomaly_detectors_schema';
import { modelsProvider } from '../models/model_management';

export const DEFAULT_TRAINED_MODELS_PAGE_SIZE = 10000;

export function trainedModelsRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/:modelId Get info of a trained inference model
   * @apiName GetTrainedModel
   * @apiDescription Retrieves configuration information for a trained model.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId?}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: optionalModelIdSchema,
            query: getInferenceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const { with_pipelines: withPipelines, ...query } = request.query;
          const body = await mlClient.getTrainedModels({
            ...query,
            ...(modelId ? { model_id: modelId } : {}),
            size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
          } as MlGetTrainedModelsRequest);
          // model_type is missing
          // @ts-ignore
          const result = body.trained_model_configs as TrainedModelConfigResponse[];
          try {
            if (withPipelines) {
              // Also need to retrieve the list of deployment IDs from stats
              const stats = await mlClient.getTrainedModelsStats({
                ...(modelId ? { model_id: modelId } : {}),
                size: 10000,
              });

              const modelDeploymentsMap = stats.trained_model_stats.reduce((acc, curr) => {
                if (!curr.deployment_stats) return acc;
                // @ts-ignore elasticsearch-js client is missing deployment_id
                const deploymentId = curr.deployment_stats.deployment_id;
                if (acc[curr.model_id]) {
                  acc[curr.model_id].push(deploymentId);
                } else {
                  acc[curr.model_id] = [deploymentId];
                }
                return acc;
              }, {} as Record<string, string[]>);

              const modelIdsAndAliases: string[] = Array.from(
                new Set([
                  ...result
                    .map(({ model_id: id, metadata }) => {
                      return [id, ...(metadata?.model_aliases ?? [])];
                    })
                    .flat(),
                  ...Object.values(modelDeploymentsMap).flat(),
                ])
              );

              const modelsManager = modelsProvider(client);
              const modelsPipelinesAndIndices = await Promise.all(
                modelIdsAndAliases.map(async (modelIdAndAlias) => {
                  return {
                    modelIdAndAlias,
                    result: await modelsManager.getModelsPipelinesAndIndicesMap(modelIdAndAlias),
                  };
                })
              );

              for (const model of result) {
                const modelAliases = model.metadata?.model_aliases ?? [];
                const modelMap = modelsPipelinesAndIndices.find(
                  (d) =>
                    d.modelIdAndAlias === model.model_id ||
                    modelAliases.find((alias) => alias === d.modelIdAndAlias)
                )?.result;
                if (modelMap) {
                  const pipelinesResponse = modelMap.ingestPipelines;
                  model.pipelines = {
                    ...(pipelinesResponse.get(model.model_id) ?? {}),
                    ...(model.metadata?.model_aliases ?? []).reduce((acc, alias) => {
                      return Object.assign(acc, pipelinesResponse.get(alias) ?? {});
                    }, {}),
                    ...(modelDeploymentsMap[model.model_id] ?? []).reduce((acc, deploymentId) => {
                      return Object.assign(acc, pipelinesResponse.get(deploymentId) ?? {});
                    }, {}),
                  };

                  model.indices = modelMap.indices;
                }
              }
            }
          } catch (e) {
            // the user might not have required permissions to fetch pipelines
            // log the error to the debug log as this might be a common situation and
            // we don't need to fill kibana's log with these messages.
            mlLog.debug(e);
          }

          return response.ok({
            body: result,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/_stats Get stats for all trained models
   * @apiName GetTrainedModelStats
   * @apiDescription Retrieves usage information for all trained models.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getTrainedModelsStats({
            size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
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
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/:modelId/_stats Get stats of a trained model
   * @apiName GetTrainedModelStatsById
   * @apiDescription Retrieves usage information for trained models.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const body = await mlClient.getTrainedModelsStats({
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
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/:modelId/pipelines Get trained model pipelines
   * @apiName GetTrainedModelPipelines
   * @apiDescription Retrieves pipelines associated with a trained model
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/pipelines`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
        try {
          const { modelId } = request.params;
          const result = await modelsProvider(client).getModelsPipelines(modelId.split(','));
          return response.ok({
            body: [...result].map(([id, pipelines]) => ({ model_id: id, pipelines })),
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/ingest_pipelines Get ingest pipelines
   * @apiName GetIngestPipelines
   * @apiDescription Retrieves pipelines
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/ingest_pipelines`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'], // TODO: update permissions
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
        try {
          const body = await modelsProvider(client).getPipelines();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/create_inference_pipeline creates the pipeline with inference processor
   * @apiName CreateInferencePipeline
   * @apiDescription Creates the inference pipeline
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/create_inference_pipeline`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createIngestPipelineSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
        try {
          const { pipeline, pipelineName } = request.body;
          const body = await modelsProvider(client).createInferencePipeline(
            pipeline!,
            pipelineName
          );
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {put} /internal/ml/trained_models/:modelId Put a trained model
   * @apiName PutTrainedModel
   * @apiDescription Adds a new trained model
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            body: schema.any(),
            query: putTrainedModelQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const body = await mlClient.putTrainedModel({
            model_id: modelId,
            body: request.body,
            ...(request.query?.defer_definition_decompression
              ? { defer_definition_decompression: true }
              : {}),
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
   * @apiGroup TrainedModels
   *
   * @api {delete} /internal/ml/trained_models/:modelId Delete a trained model
   * @apiName DeleteTrainedModel
   * @apiDescription Deletes an existing trained model that is currently not referenced by an ingest pipeline.
   */
  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canDeleteTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            query: deleteTrainedModelQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response, client }) => {
        try {
          const { modelId } = request.params;
          const { with_pipelines: withPipelines, force } = request.query;

          if (withPipelines) {
            // first we need to delete pipelines, otherwise ml api return an error
            await modelsProvider(client).deleteModelPipelines(modelId.split(','));
          }

          const body = await mlClient.deleteTrainedModel({
            model_id: modelId,
            force,
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
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/:modelId/deployment/_start Start trained model deployment
   * @apiName StartTrainedModelDeployment
   * @apiDescription Starts trained model deployment.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/deployment/_start`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            query: threadingParamsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const body = await mlClient.startTrainedModelDeployment({
            model_id: modelId,
            ...(request.query ? request.query : {}),
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
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/:modelId/deployment/_update Update trained model deployment
   * @apiName UpdateTrainedModelDeployment
   * @apiDescription Updates trained model deployment.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_update`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: modelAndDeploymentIdSchema, body: updateDeploymentParamsSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId, deploymentId } = request.params;
          const body = await mlClient.updateTrainedModelDeployment({
            model_id: modelId,
            deployment_id: deploymentId,
            ...request.body,
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
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/:modelId/deployment/_stop Stop trained model deployment
   * @apiName StopTrainedModelDeployment
   * @apiDescription Stops trained model deployment.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_stop`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelAndDeploymentIdSchema,
            query: forceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { deploymentId, modelId } = request.params;

          const results: Record<string, { success: boolean; error?: ErrorType }> = {};

          for (const id of deploymentId.split(',')) {
            try {
              const { stopped: success } = await mlClient.stopTrainedModelDeployment({
                model_id: modelId,
                deployment_id: id,
                force: request.query.force ?? false,
                allow_no_match: false,
              });
              results[id] = { success };
            } catch (error) {
              results[id] = { success: false, error };
            }
          }
          return response.ok({
            body: results,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/pipeline_simulate Simulates an ingest pipeline
   * @apiName SimulateIngestPipeline
   * @apiDescription Simulates an ingest pipeline.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/pipeline_simulate`,
      access: 'internal',
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: pipelineSimulateBody,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const { pipeline, docs } = request.body;
          const body = await client.asInternalUser.ingest.simulate({
            pipeline,
            docs,
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
   * @apiGroup TrainedModels
   *
   * @api {post} /internal/ml/trained_models/infer/:modelId Evaluates a trained model
   * @apiName InferTrainedModelDeployment
   * @apiDescription Evaluates a trained model.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/infer/{modelId}/{deploymentId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelAndDeploymentIdSchema,
            query: inferTrainedModelQuery,
            body: inferTrainedModelBody,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId, deploymentId } = request.params;
          const body = await mlClient.inferTrainedModel({
            model_id: modelId,
            deployment_id: deploymentId,
            body: {
              docs: request.body.docs,
              ...(request.body.inference_config
                ? { inference_config: request.body.inference_config }
                : {}),
            },
            ...(request.query.timeout ? { timeout: request.query.timeout } : {}),
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
