/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { groupBy } from 'lodash';
import { schema } from '@kbn/config-schema';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElserVersion, InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { isDefined } from '@kbn/ml-is-defined';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { type MlFeatures, ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import type { RouteInitialization } from '../types';
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
  modelDownloadsQuery,
} from './schemas/inference_schema';
import type { PipelineDefinition } from '../../common/types/trained_models';
import { type TrainedModelConfigResponse } from '../../common/types/trained_models';
import { mlLog } from '../lib/log';
import { forceQuerySchema } from './schemas/anomaly_detectors_schema';
import { modelsProvider } from '../models/model_management';

export const DEFAULT_TRAINED_MODELS_PAGE_SIZE = 10000;

export function filterForEnabledFeatureModels<
  T extends TrainedModelConfigResponse | estypes.MlTrainedModelConfig
>(models: T[], enabledFeatures: MlFeatures) {
  let filteredModels = models;
  if (enabledFeatures.nlp === false) {
    filteredModels = filteredModels.filter((m) => m.model_type === 'tree_ensemble');
  }

  if (enabledFeatures.dfa === false) {
    filteredModels = filteredModels.filter((m) => m.model_type !== 'tree_ensemble');
  }

  return filteredModels;
}

export const populateInferenceServicesProvider = (client: IScopedClusterClient) => {
  return async function populateInferenceServices(
    trainedModels: TrainedModelConfigResponse[],
    asInternal: boolean = false
  ) {
    const esClient = asInternal ? client.asInternalUser : client.asCurrentUser;

    try {
      // Check if model is used by an inference service
      const { models } = await esClient.transport.request<{
        models: InferenceAPIConfigResponse[];
      }>({
        method: 'GET',
        path: `/_inference/_all`,
      });

      const inferenceAPIMap = groupBy(
        models,
        (model) => model.service === 'elser' && model.service_settings.model_id
      );

      for (const model of trainedModels) {
        const inferenceApis = inferenceAPIMap[model.model_id];
        model.hasInferenceServices = !!inferenceApis;
        if (model.hasInferenceServices && !asInternal) {
          model.inference_apis = inferenceApis;
        }
      }
    } catch (e) {
      if (!asInternal && e.statusCode === 403) {
        // retry with internal user to get an indicator if models has associated inference services, without mentioning the names
        await populateInferenceServices(trainedModels, true);
      } else {
        mlLog.error(e);
      }
    }
  };
};

export function trainedModelsRoutes(
  { router, routeGuard, getEnabledFeatures }: RouteInitialization,
  cloud: CloudSetup
) {
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
          const {
            with_pipelines: withPipelines,
            with_indices: withIndicesRaw,
            ...getTrainedModelsRequestParams
          } = request.query;

          const withIndices =
            request.query.with_indices === 'true' || request.query.with_indices === true;

          const resp = await mlClient.getTrainedModels({
            ...getTrainedModelsRequestParams,
            ...(modelId ? { model_id: modelId } : {}),
            size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
          } as estypes.MlGetTrainedModelsRequest);
          // model_type is missing
          // @ts-ignore
          const result = resp.trained_model_configs as TrainedModelConfigResponse[];

          const populateInferenceServices = populateInferenceServicesProvider(client);
          await populateInferenceServices(result, false);

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
              const modelsClient = modelsProvider(client, mlClient, cloud);

              const modelsPipelinesAndIndices = await Promise.all(
                modelIdsAndAliases.map(async (modelIdOrAlias) => {
                  return {
                    modelIdOrAlias,
                    result: await modelsClient.getModelsPipelinesAndIndicesMap(modelIdOrAlias, {
                      withIndices,
                    }),
                  };
                })
              );

              for (const model of result) {
                const modelAliases = model.metadata?.model_aliases ?? [];
                const modelMap = modelsPipelinesAndIndices.find(
                  (d) => d.modelIdOrAlias === model.model_id
                )?.result;

                const allRelatedModels = modelsPipelinesAndIndices
                  .filter(
                    (m) =>
                      [
                        model.model_id,
                        ...modelAliases,
                        ...(modelDeploymentsMap[model.model_id] ?? []),
                      ].findIndex((alias) => alias === m.modelIdOrAlias) > -1
                  )
                  .map((r) => r?.result)
                  .filter(isDefined);
                const ingestPipelinesFromModelAliases = allRelatedModels
                  .map((r) => r?.ingestPipelines)
                  .filter(isDefined) as Array<Map<string, Record<string, PipelineDefinition>>>;

                model.pipelines = ingestPipelinesFromModelAliases.reduce<
                  Record<string, PipelineDefinition>
                >((allPipelines, modelsToPipelines) => {
                  for (const [, pipelinesObj] of modelsToPipelines?.entries()) {
                    Object.entries(pipelinesObj).forEach(([pipelineId, pipelineInfo]) => {
                      allPipelines[pipelineId] = pipelineInfo;
                    });
                  }
                  return allPipelines;
                }, {});

                if (modelMap && withIndices) {
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

          const filteredModels = filterForEnabledFeatureModels(result, getEnabledFeatures());

          try {
            const jobIds = filteredModels
              .map((model) => {
                const id = model.metadata?.analytics_config?.id;
                if (id) {
                  return `${id}*`;
                }
              })
              .filter((id) => id !== undefined);

            if (jobIds.length) {
              const { data_frame_analytics: jobs } = await mlClient.getDataFrameAnalytics({
                id: jobIds.join(','),
                allow_no_match: true,
              });

              filteredModels.forEach((model) => {
                const dfaId = model?.metadata?.analytics_config?.id;
                if (dfaId !== undefined) {
                  // if this is a dfa model, set origin_job_exists
                  model.origin_job_exists = jobs.find((job) => job.id === dfaId) !== undefined;
                }
              });
            }
          } catch (e) {
            // Swallow error to prevent blocking trained models result
          }

          return response.ok({
            body: filteredModels,
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
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
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
          const result = await modelsProvider(client, mlClient, cloud).getModelsPipelines(
            modelId.split(',')
          );
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
          const body = await modelsProvider(client, mlClient, cloud).getPipelines();
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
          const body = await modelsProvider(client, mlClient, cloud).createInferencePipeline(
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
            await modelsProvider(client, mlClient, cloud).deleteModelPipelines(modelId.split(','));
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

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/model_downloads Gets available models for download
   * @apiName GetTrainedModelDownloadList
   * @apiDescription Gets available models for download with default and recommended flags based on the cluster OS and CPU architecture.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/model_downloads`,
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
      routeGuard.fullLicenseAPIGuard(async ({ response, mlClient, client }) => {
        try {
          const body = await modelsProvider(client, mlClient, cloud).getModelDownloads();

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
   * @api {get} /internal/ml/trained_models/elser_config Gets ELSER config for download
   * @apiName GetElserConfig
   * @apiDescription Gets ELSER config for download based on the cluster OS and CPU architecture.
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/elser_config`,
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
            query: modelDownloadsQuery,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ response, client, mlClient, request }) => {
        try {
          const { version } = request.query;

          const body = await modelsProvider(client, mlClient, cloud).getELSER(
            version ? { version: Number(version) as ElserVersion } : undefined
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
   * @api {post} /internal/ml/trained_models/install_elastic_trained_model/:modelId Installs Elastic trained model
   * @apiName InstallElasticTrainedModel
   * @apiDescription Downloads and installs Elastic trained model.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/install_elastic_trained_model/{modelId}`,
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
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { modelId } = request.params;
            const body = await modelsProvider(client, mlClient, cloud).installElasticModel(
              modelId,
              mlSavedObjectService
            );

            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /internal/ml/trained_models/download_status Gets models download status
   * @apiName ModelsDownloadStatus
   * @apiDescription Gets download status for all currently downloading models
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/download_status`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const body = await modelsProvider(client, mlClient, cloud).getModelsDownloadStatus();

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
