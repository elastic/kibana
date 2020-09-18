/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { PipelineDefinition } from '../../../common/types/inference';

export function modelsProvider(client: IScopedClusterClient) {
  return {
    /**
     * Retrieves the map of model ids and associated pipelines.
     * @param modelIds
     */
    async getModelsPipelines(modelIds: string[]) {
      const modelIdsMap = new Map<string, Record<string, PipelineDefinition> | null>(
        modelIds.map((id: string) => [id, null])
      );

      const { body } = await client.asCurrentUser.ingest.getPipeline();

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

      return modelIdsMap;
    },
  };
}
