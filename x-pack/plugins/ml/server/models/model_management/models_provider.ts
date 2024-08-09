/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from '@kbn/core/server';
import { JOB_MAP_NODE_TYPES, type MapElements } from '@kbn/ml-data-frame-analytics-utils';
import { flatten } from 'lodash';
import type {
  InferenceModelConfig,
  InferenceTaskType,
  TasksTaskInfo,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import type { IndexName, IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type {
  IngestPipeline,
  IngestSimulateDocument,
  IngestSimulateRequest,
  NodesInfoResponseBase,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ELASTIC_MODEL_DEFINITIONS,
  type GetModelDownloadConfigOptions,
  type ModelDefinitionResponse,
} from '@kbn/ml-trained-models-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticCuratedModelName } from '@kbn/ml-trained-models-utils';
import type { ModelDownloadState, PipelineDefinition } from '../../../common/types/trained_models';
import type { MlClient } from '../../lib/ml_client';
import type { MLSavedObjectService } from '../../saved_objects';

export type ModelService = ReturnType<typeof modelsProvider>;

export const modelsProvider = (
  client: IScopedClusterClient,
  mlClient: MlClient,
  cloud: CloudSetup
) => new ModelsProvider(client, mlClient, cloud);

interface ModelMapResult {
  ingestPipelines: Map<string, Record<string, PipelineDefinition> | null>;
  indices: Array<Record<IndexName, IndicesIndexState | null>>;
  /**
   * Map elements
   */
  elements: MapElements[];
  /**
   * Transform, job or index details
   */
  details: Record<string, any>;
  /**
   * Error
   */
  error: null | any;
}

export type GetCuratedModelConfigParams = Parameters<ModelsProvider['getCuratedModelConfig']>;

export class ModelsProvider {
  private _transforms?: TransformGetTransformTransformSummary[];

  constructor(
    private _client: IScopedClusterClient,
    private _mlClient: MlClient,
    private _cloud: CloudSetup
  ) {}

  private async initTransformData() {
    if (!this._transforms) {
      try {
        const body = await this._client.asCurrentUser.transform.getTransform({
          size: 1000,
        });
        this._transforms = body.transforms;
        return body.transforms;
      } catch (e) {
        if (e.meta?.statusCode !== 403) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }
  }

  private async getIndexData(index: string): Promise<Record<IndexName, IndicesIndexState | null>> {
    try {
      const indexData = await this._client.asInternalUser.indices.get({
        index,
      });
      return indexData;
    } catch (e) {
      // Possible that the user doesn't have permissions to view
      // If so, gracefully exit
      if (e.meta?.statusCode !== 403) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      return { [index]: null };
    }
  }

  private getNodeId(
    elementOriginalId: string,
    nodeType: (typeof JOB_MAP_NODE_TYPES)[keyof typeof JOB_MAP_NODE_TYPES]
  ): string {
    return `${elementOriginalId}-${nodeType}`;
  }

  /**
   * Simulates the effect of the pipeline on given document.
   *
   */
  async simulatePipeline(docs: IngestSimulateDocument[], pipelineConfig: IngestPipeline) {
    const simulateRequest: IngestSimulateRequest = {
      docs,
      pipeline: pipelineConfig,
    };
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.simulate(simulateRequest);
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Creates the pipeline
   *
   */
  async createInferencePipeline(pipelineConfig: IngestPipeline, pipelineName: string) {
    let result = {};

    result = await this._client.asCurrentUser.ingest.putPipeline({
      id: pipelineName,
      ...pipelineConfig,
    });

    return result;
  }

  /**
   * Retrieves existing pipelines.
   *
   */
  async getPipelines() {
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.getPipeline();
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Retrieves the map of model ids and aliases with associated pipelines.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelines(modelIds: string[]) {
    const modelIdsMap = new Map<string, Record<string, PipelineDefinition> | null>(
      modelIds.map((id: string) => [id, null])
    );

    try {
      const body = await this._client.asCurrentUser.ingest.getPipeline();

      for (const [pipelineName, pipelineDefinition] of Object.entries(body)) {
        const { processors } = pipelineDefinition as { processors: Array<Record<string, any>> };

        for (const processor of processors) {
          const id = processor.inference?.model_id;
          if (modelIdsMap.has(id)) {
            const obj = modelIdsMap.get(id);
            if (obj === null) {
              modelIdsMap.set(id, { [pipelineName]: pipelineDefinition });
            } else {
              obj![pipelineName] = pipelineDefinition;
            }
          }
        }
      }
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return modelIdsMap;
      }
      throw error;
    }

    return modelIdsMap;
  }

  /**
   * Retrieves the network map and metadata of model ids, pipelines, and indices that are tied to the model ids.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelinesAndIndicesMap(
    modelId: string,
    {
      withIndices,
    }: {
      withIndices: boolean;
    }
  ): Promise<ModelMapResult> {
    const result: ModelMapResult = {
      ingestPipelines: new Map(),
      indices: [],
      elements: [],
      details: {},
      error: null,
    };

    let pipelinesResponse;
    let indicesSettings;

    try {
      pipelinesResponse = await this.getModelsPipelines([modelId]);

      // 1. Get list of pipelines that are related to the model
      const pipelines = pipelinesResponse?.get(modelId);
      const modelNodeId = this.getNodeId(modelId, JOB_MAP_NODE_TYPES.TRAINED_MODEL);

      if (pipelines) {
        const pipelineIds = new Set(Object.keys(pipelines));
        result.ingestPipelines = pipelinesResponse;

        for (const pipelineId of pipelineIds) {
          const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);
          result.details[pipelineNodeId] = pipelines[pipelineId];

          result.elements.push({
            data: {
              id: pipelineNodeId,
              label: pipelineId,
              type: JOB_MAP_NODE_TYPES.INGEST_PIPELINE,
            },
          });

          result.elements.push({
            data: {
              id: `${modelNodeId}~${pipelineNodeId}`,
              source: modelNodeId,
              target: pipelineNodeId,
            },
          });
        }

        if (withIndices === true) {
          const pipelineIdsToDestinationIndices: Record<string, string[]> = {};

          let indicesPermissions;
          try {
            indicesSettings = await this._client.asInternalUser.indices.getSettings();
            const hasPrivilegesResponse = await this._client.asCurrentUser.security.hasPrivileges({
              index: [
                {
                  names: Object.keys(indicesSettings),
                  privileges: ['read'],
                },
              ],
            });
            indicesPermissions = hasPrivilegesResponse.index;
          } catch (e) {
            // Possible that the user doesn't have permissions to view
            // If so, gracefully exit
            if (e.meta?.statusCode !== 403) {
              // eslint-disable-next-line no-console
              console.error(e);
            }
            return result;
          }

          // 2. From list of model pipelines, find all indices that have pipeline set as index.default_pipeline
          for (const [indexName, { settings }] of Object.entries(indicesSettings)) {
            if (
              settings?.index?.default_pipeline &&
              pipelineIds.has(settings.index.default_pipeline) &&
              indicesPermissions[indexName]?.read === true
            ) {
              if (Array.isArray(pipelineIdsToDestinationIndices[settings.index.default_pipeline])) {
                pipelineIdsToDestinationIndices[settings.index.default_pipeline].push(indexName);
              } else {
                pipelineIdsToDestinationIndices[settings.index.default_pipeline] = [indexName];
              }
            }
          }

          // 3. Grab index information for all the indices found, and add their info to the map
          for (const [pipelineId, indexIds] of Object.entries(pipelineIdsToDestinationIndices)) {
            const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);

            for (const destinationIndexId of indexIds) {
              const destinationIndexNodeId = this.getNodeId(
                destinationIndexId,
                JOB_MAP_NODE_TYPES.INDEX
              );

              const destinationIndexDetails = await this.getIndexData(destinationIndexId);

              result.indices.push(destinationIndexDetails);

              result.details[destinationIndexNodeId] = {
                ...destinationIndexDetails,
                ml_inference_models: [modelId],
              };

              result.elements.push({
                data: {
                  id: destinationIndexNodeId,
                  label: destinationIndexId,
                  type: JOB_MAP_NODE_TYPES.INDEX,
                },
              });

              result.elements.push({
                data: {
                  id: `${pipelineNodeId}~${destinationIndexNodeId}`,
                  source: pipelineNodeId,
                  target: destinationIndexNodeId,
                },
              });
            }
          }

          const destinationIndices = flatten(Object.values(pipelineIdsToDestinationIndices));

          // 4. From these destination indices, check if there's any transforms that have the indexId as the source destination index
          if (destinationIndices.length > 0) {
            const transforms = await this.initTransformData();

            if (!transforms) return result;

            for (const destinationIndex of destinationIndices) {
              const destinationIndexNodeId = `${destinationIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

              const foundTransform = transforms?.find((t) => {
                const transformSourceIndex = Array.isArray(t.source.index)
                  ? t.source.index[0]
                  : t.source.index;
                return transformSourceIndex === destinationIndex;
              });

              // 5. If any of the transforms use these indices as source , find the destination indices to complete the map
              if (foundTransform) {
                const transformDestIndex = foundTransform.dest.index;
                const transformNodeId = `${foundTransform.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
                const transformDestIndexNodeId = `${transformDestIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

                const destIndex = await this.getIndexData(transformDestIndex);

                result.indices.push(destIndex);

                result.details[transformNodeId] = foundTransform;
                result.details[transformDestIndexNodeId] = destIndex;

                result.elements.push(
                  {
                    data: {
                      id: transformNodeId,
                      label: foundTransform.id,
                      type: JOB_MAP_NODE_TYPES.TRANSFORM,
                    },
                  },
                  {
                    data: {
                      id: transformDestIndexNodeId,
                      label: transformDestIndex,
                      type: JOB_MAP_NODE_TYPES.INDEX,
                    },
                  }
                );

                result.elements.push(
                  {
                    data: {
                      id: `${destinationIndexNodeId}~${transformNodeId}`,
                      source: destinationIndexNodeId,
                      target: transformNodeId,
                    },
                  },
                  {
                    data: {
                      id: `${transformNodeId}~${transformDestIndexNodeId}`,
                      source: transformNodeId,
                      target: transformDestIndexNodeId,
                    },
                  }
                );
              }
            }
          }
        }
      }
      return result;
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return result;
      }
      throw error;
    }
  }

  /**
   * Deletes associated pipelines of the requested model
   * @param modelIds
   */
  async deleteModelPipelines(modelIds: string[]) {
    const pipelines = await this.getModelsPipelines(modelIds);
    const pipelinesIds: string[] = [
      ...new Set([...pipelines.values()].flatMap((v) => Object.keys(v!))),
    ];
    await Promise.all(
      pipelinesIds.map((id) => this._client.asCurrentUser.ingest.deletePipeline({ id }))
    );
  }

  /**
   * Returns a list of elastic curated models available for download.
   */
  async getModelDownloads(): Promise<ModelDefinitionResponse[]> {
    // We assume that ML nodes in Cloud are always on linux-x86_64, even if other node types aren't.
    const isCloud = !!this._cloud?.cloudId;

    const nodesInfoResponse =
      await this._client.asInternalUser.transport.request<NodesInfoResponseBase>({
        method: 'GET',
        path: `/_nodes/ml:true/os`,
      });

    let osName: string | undefined;
    let arch: string | undefined;
    // Indicates that all ML nodes have the same architecture
    let sameArch = true;
    for (const node of Object.values(nodesInfoResponse.nodes)) {
      if (!osName) {
        osName = node.os?.name;
      }
      if (!arch) {
        arch = node.os?.arch;
      }
      if (node.os?.name !== osName || node.os?.arch !== arch) {
        sameArch = false;
        break;
      }
    }

    const modelDefinitionMap = new Map<string, ModelDefinitionResponse[]>();

    for (const [modelId, def] of Object.entries(ELASTIC_MODEL_DEFINITIONS)) {
      const recommended =
        (isCloud && def.os === 'Linux' && def.arch === 'amd64') ||
        (sameArch && !!def?.os && def?.os === osName && def?.arch === arch);

      const { modelName } = def;

      const modelDefinitionResponse = {
        ...def,
        ...(recommended ? { recommended } : {}),
        supported: !!def.default || recommended,
        model_id: modelId,
      };

      if (modelDefinitionMap.has(modelName)) {
        modelDefinitionMap.get(modelName)!.push(modelDefinitionResponse);
      } else {
        modelDefinitionMap.set(modelName, [modelDefinitionResponse]);
      }
    }

    // check if there is no recommended, so we mark default as recommended
    for (const arr of modelDefinitionMap.values()) {
      const defaultModel = arr.find((a) => a.default);
      const recommendedModel = arr.find((a) => a.recommended);
      if (defaultModel && !recommendedModel) {
        delete defaultModel.default;
        defaultModel.recommended = true;
      }
    }

    return [...modelDefinitionMap.values()].flat();
  }

  /**
   * Provides an appropriate model ID and configuration for download based on the current cluster architecture.
   *
   * @param modelName
   * @param options
   * @returns
   */
  async getCuratedModelConfig(
    modelName: ElasticCuratedModelName,
    options?: GetModelDownloadConfigOptions
  ): Promise<ModelDefinitionResponse> | never {
    const modelDownloadConfig = (await this.getModelDownloads()).filter(
      (model) => model.modelName === modelName
    );
    let requestedModel: ModelDefinitionResponse | undefined;
    let recommendedModel: ModelDefinitionResponse | undefined;
    let defaultModel: ModelDefinitionResponse | undefined;

    for (const model of modelDownloadConfig) {
      if (options?.version === model.version) {
        requestedModel = model;
        if (model.recommended) {
          requestedModel = model;
          break;
        }
      } else if (model.recommended) {
        recommendedModel = model;
      } else if (model.default) {
        defaultModel = model;
      }
    }

    if (!requestedModel && !defaultModel && !recommendedModel) {
      throw new Error('Requested model not found');
    }

    return requestedModel || recommendedModel || defaultModel!;
  }

  /**
   * Provides an ELSER model name and configuration for download based on the current cluster architecture.
   * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
   * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
   * a portable version of the model is returned.
   */
  async getELSER(
    options?: GetModelDownloadConfigOptions
  ): Promise<ModelDefinitionResponse> | never {
    return await this.getCuratedModelConfig('elser', options);
  }

  /**
   * Puts the requested ELSER model into elasticsearch, triggering elasticsearch to download the model.
   * Assigns the model to the * space.
   * @param modelId
   * @param mlSavedObjectService
   */
  async installElasticModel(modelId: string, mlSavedObjectService: MLSavedObjectService) {
    const availableModels = await this.getModelDownloads();
    const model = availableModels.find((m) => m.model_id === modelId);
    if (!model) {
      throw Boom.notFound('Model not found');
    }

    let esModelExists = false;
    try {
      await this._client.asInternalUser.ml.getTrainedModels({ model_id: modelId });
      esModelExists = true;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
      // model doesn't exist, ignore error
    }

    if (esModelExists) {
      throw Boom.badRequest('Model already exists');
    }

    const putResponse = await this._mlClient.putTrainedModel({
      model_id: model.model_id,
      body: model.config,
    });

    await mlSavedObjectService.updateTrainedModelsSpaces([modelId], ['*'], []);
    return putResponse;
  }
  /**
   * Puts the requested Inference endpoint id into elasticsearch, triggering elasticsearch to create the inference endpoint id
   * @param inferenceId - Inference Endpoint Id
   * @param taskType - Inference Task type. Either sparse_embedding or text_embedding
   * @param modelConfig - Model configuration based on service type
   */
  async createInferenceEndpoint(
    inferenceId: string,
    taskType: InferenceTaskType,
    modelConfig: InferenceModelConfig
  ) {
    try {
      const result = await this._client.asCurrentUser.inference.putModel(
        {
          inference_id: inferenceId,
          task_type: taskType,
          model_config: modelConfig,
        },
        { maxRetries: 0 }
      );
      return result;
    } catch (error) {
      // Request timeouts will usually occur when the model is being downloaded/deployed
      // Erroring out is misleading in these cases, so we return the model_id and task_type
      if (error.name === 'TimeoutError') {
        return {
          model_id: modelConfig.service,
          task_type: taskType,
        };
      } else {
        throw error;
      }
    }
  }

  async getModelsDownloadStatus() {
    const result = await this._client.asInternalUser.tasks.list({
      actions: 'xpack/ml/model_import[n]',
      detailed: true,
      group_by: 'none',
    });

    if (!result.tasks?.length) {
      return {};
    }

    // Groups results by model id
    const byModelId = (result.tasks as TasksTaskInfo[]).reduce((acc, task) => {
      const modelId = task.description!.replace(`model_id-`, '');
      acc[modelId] = {
        downloaded_parts: task.status.downloaded_parts,
        total_parts: task.status.total_parts,
      };
      return acc;
    }, {} as Record<string, ModelDownloadState>);

    return byModelId;
  }
}
