/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  IngestPipeline,
  IngestSimulateDocument,
  IngestSimulateRequest,
  NodesInfoResponseBase,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ELASTIC_MODEL_DEFINITIONS,
  type GetElserOptions,
  type ModelDefinitionResponse,
} from '@kbn/ml-trained-models-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { PipelineDefinition } from '../../../common/types/trained_models';

export type ModelService = ReturnType<typeof modelsProvider>;

export function modelsProvider(client: IScopedClusterClient, cloud?: CloudSetup) {
  return {
    /**
     * Retrieves the map of model ids and aliases with associated pipelines.
     * @param modelIds - Array of models ids and model aliases.
     */
    async getModelsPipelines(modelIds: string[]) {
      const modelIdsMap = new Map<string, Record<string, PipelineDefinition> | null>(
        modelIds.map((id: string) => [id, null])
      );

      try {
        const body = await client.asCurrentUser.ingest.getPipeline();

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
    },

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
        pipelinesIds.map((id) => client.asCurrentUser.ingest.deletePipeline({ id }))
      );
    },

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
        result = await client.asCurrentUser.ingest.simulate(simulateRequest);
      } catch (error) {
        if (error.statusCode === 404) {
          // ES returns 404 when there are no pipelines
          // Instead, we should return an empty response and a 200
          return result;
        }
        throw error;
      }

      return result;
    },

    /**
     * Creates the pipeline
     *
     */
    async createInferencePipeline(pipelineConfig: IngestPipeline, pipelineName: string) {
      let result = {};

      result = await client.asCurrentUser.ingest.putPipeline({
        id: pipelineName,
        ...pipelineConfig,
      });

      return result;
    },

    /**
     * Retrieves existing pipelines.
     *
     */
    async getPipelines() {
      let result = {};
      try {
        result = await client.asCurrentUser.ingest.getPipeline();
      } catch (error) {
        if (error.statusCode === 404) {
          // ES returns 404 when there are no pipelines
          // Instead, we should return an empty response and a 200
          return result;
        }
        throw error;
      }

      return result;
    },

    /**
     * Returns a list of elastic curated models available for download.
     */
    async getModelDownloads(): Promise<ModelDefinitionResponse[]> {
      // We assume that ML nodes in Cloud are always on linux-x86_64, even if other node types aren't.
      const isCloud = !!cloud?.cloudId;

      const nodesInfoResponse =
        await client.asInternalUser.transport.request<NodesInfoResponseBase>({
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

      for (const [name, def] of Object.entries(ELASTIC_MODEL_DEFINITIONS)) {
        const recommended =
          (isCloud && def.os === 'Linux' && def.arch === 'amd64') ||
          (sameArch && !!def?.os && def?.os === osName && def?.arch === arch);

        const { modelName, ...rest } = def;

        const modelDefinitionResponse = {
          ...rest,
          ...(recommended ? { recommended } : {}),
          name,
        };

        if (modelDefinitionMap.has(modelName)) {
          modelDefinitionMap.get(modelName)!.push(modelDefinitionResponse);
        } else {
          modelDefinitionMap.set(modelName, [modelDefinitionResponse]);
        }
      }

      // check if there is no recommended, so we mark default as recommended
      for (const [, arr] of modelDefinitionMap.entries()) {
        const defaultModel = arr.find((a) => a.default);
        const recommendedModel = arr.find((a) => a.recommended);
        if (defaultModel && !recommendedModel) {
          delete defaultModel.default;
          defaultModel.recommended = true;
        }
      }

      return [...modelDefinitionMap.values()].flat();
    },

    /**
     * Provides an ELSER model name and configuration for download based on the current cluster architecture.
     * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
     * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
     * a portable version of the model is returned.
     */
    async getELSER(options?: GetElserOptions): Promise<ModelDefinitionResponse> | never {
      const modelDownloadConfig = await this.getModelDownloads();

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
    },
  };
}
