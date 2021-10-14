/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from 'kibana/server';
import type { PipelineDefinition } from '../../../common/types/trained_models';
import type { MlClient } from '../../lib/ml_client';

export type ModelService = ReturnType<typeof modelsProvider>;

export function modelsProvider(client: IScopedClusterClient, mlClient: MlClient) {
  return {
    /**
     * Retrieves the map of model ids and aliases with associated pipelines.
     * @param modelIds - Array of models ids and model aliases.
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

    async getNodesOverview() {
      const { body: deploymentStats } = await mlClient.getTrainedModelsDeploymentStats();

      const nodesR = deploymentStats.deployment_stats.reduce((acc, curr) => {
        const { nodes, ...modelAttrs } = curr;
        nodes.forEach((n) => {
          Object.entries(n.node).forEach(([id, o]) => {
            if (acc.has(id)) {
              const d = acc.get(id);
              d.allocated_models.push(modelAttrs);
            } else {
              acc.set(id, { ...o, id, allocated_models: [modelAttrs] });
            }
          });
        });
        return acc;
      }, new Map<string, object>());

      return {
        count: nodesR.size,
        nodes: Array.from(nodesR.values()),
      };
    },
  };
}
