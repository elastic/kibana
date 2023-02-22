/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

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
  };
}
