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
import type {
  ElasticCuratedModelName,
  ElserVersion,
  InferenceAPIConfigResponse,
} from '@kbn/ml-trained-models-utils';
import { isDefined } from '@kbn/ml-is-defined';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { type MlFeatures, ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import type { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import {
  createIngestPipelineSchema,
  curatedModelsParamsSchema,
  curatedModelsQuerySchema,
  deleteTrainedModelQuerySchema,
  getInferenceQuerySchema,
  inferTrainedModelBody,
  inferTrainedModelQuery,
  modelAndDeploymentIdSchema,
  modelDownloadsQuery,
  modelIdSchema,
  optionalModelIdSchema,
  pipelineSimulateBody,
  putTrainedModelQuerySchema,
  threadingParamsBodySchema,
  threadingParamsQuerySchema,
  updateDeploymentParamsSchema,
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
      const { endpoints } = await esClient.transport.request<{
        endpoints: InferenceAPIConfigResponse[];
      }>({
        method: 'GET',
        path: `/_inference/_all`,
      });

      const inferenceAPIMap = groupBy(
        endpoints,
        (endpoint) => endpoint.service === 'elser' && endpoint.service_settings.model_id
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
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models_list`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get trained models list',
      description:
        'Retrieves a complete list if trained models with stats, pipelines, and indices.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const modelsClient = modelsProvider(client, mlClient, cloud, getEnabledFeatures());
          const models = await modelsClient.getTrainedModelList();
          return response.ok({
            body: models,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId?}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get info of a trained inference model',
      description: 'Retrieves configuration information for a trained model.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get stats for all trained models',
      description: 'Retrieves usage information for all trained models.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get stats for a trained model',
      description: 'Retrieves usage information for a trained model.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/pipelines`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get trained model pipelines',
      description: 'Retrieves ingest pipelines associated with a trained model.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/ingest_pipelines`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get ingest pipelines',
      description: 'Retrieves ingest pipelines.',
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/create_inference_pipeline`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Create an inference pipeline',
      description: 'Creates a pipeline with inference processor',
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

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Put a trained model',
      description: 'Adds a new trained model',
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

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteTrainedModels'],
        },
      },
      summary: 'Delete a trained model',
      description:
        'Deletes an existing trained model that is currently not referenced by an ingest pipeline.',
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/deployment/_start`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Start trained model deployment',
      description: 'Starts trained model deployment.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            query: threadingParamsQuerySchema,
            body: threadingParamsBodySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;

          // TODO use mlClient.startTrainedModelDeployment when esClient is updated
          const body = await mlClient.startTrainedModelDeployment(
            {
              model_id: modelId,
              ...(request.query ? request.query : {}),
              ...(request.body ? request.body : {}),
            },
            {
              maxRetries: 0,
            }
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_update`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Update trained model deployment',
      description: 'Updates trained model deployment.',
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_stop`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Stop trained model deployment',
      description: 'Stops trained model deployment.',
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

          const results: Record<string, { success: boolean; error?: ErrorType }> =
            Object.create(null);

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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/pipeline_simulate`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canTestTrainedModels'],
        },
      },
      summary: 'Simulates an ingest pipeline',
      description: 'Simulates an ingest pipeline.',
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/infer/{modelId}/{deploymentId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canTestTrainedModels'],
        },
      },
      summary: 'Evaluates a trained model.',
      description: 'Evaluates a trained model.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/model_downloads`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get available models for download',
      description:
        'Gets available models for download with supported and recommended flags based on the cluster OS and CPU architecture.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/elser_config`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get ELSER config for download',
      description: 'Gets ELSER config for download based on the cluster OS and CPU architecture.',
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/install_elastic_trained_model/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Install Elastic trained model',
      description: 'Downloads and installs Elastic trained model.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/download_status`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Get models download status',
      description: 'Gets download status for all currently downloading models.',
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/curated_model_config/{modelName}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get curated model config',
      description:
        'Gets curated model config for the specified model based on cluster architecture.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: curatedModelsParamsSchema,
            query: curatedModelsQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const body = await modelsProvider(client, mlClient, cloud).getCuratedModelConfig(
              request.params.modelName as ElasticCuratedModelName,
              { version: request.query.version as ElserVersion }
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
}
