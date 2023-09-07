/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import {
  IngestPipeline,
  IngestSimulateDocument,
  IngestSimulateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { PipelineDefinition } from '../../../common/types/trained_models';

export type ModelService = ReturnType<typeof modelsProvider>;

export function modelsProvider(client: IScopedClusterClient) {
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
  };
}
