/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from 'kibana/server';
import { sumBy } from 'lodash';
import type {
  NodeDeploymentStatsResponse,
  PipelineDefinition,
  NodesOverviewResponse,
} from '../../../common/types/trained_models';
import type { MlClient } from '../../lib/ml_client';
import { MemoryOverviewService } from '../memory_overview/memory_overview_service';

export type ModelService = ReturnType<typeof modelsProvider>;

export function modelsProvider(
  client: IScopedClusterClient,
  mlClient: MlClient,
  memoryOverviewService?: MemoryOverviewService
) {
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

    /**
     * Provides the ML nodes overview with allocated models.
     */
    async getNodesOverview(): Promise<NodesOverviewResponse> {
      if (!memoryOverviewService) {
        throw new Error('Memory overview service is not provided');
      }

      const { body: deploymentStats } = await mlClient.getTrainedModelsDeploymentStats();

      const adMemoryReport = await memoryOverviewService.getAnomalyDetectionMemoryOverview();

      const dfaMemoryReport = await memoryOverviewService.getDFAMemoryOverview();

      const nodesR = deploymentStats.deployment_stats.reduce((acc, curr) => {
        const { nodes, ...modelAttrs } = curr;
        nodes.forEach((n) => {
          Object.entries(n.node).forEach(([nodeId, o]) => {
            if (acc.has(nodeId)) {
              const d = acc.get(nodeId)!;
              d.allocated_models.push(modelAttrs);
            } else {
              acc.set(nodeId, {
                ...o,
                id: nodeId,
                allocated_models: [modelAttrs],
                memory_overview: {
                  machine_memory: {
                    total: Number(o.attributes['ml.machine_memory']),
                  },
                  anomaly_detection: {
                    total: sumBy(
                      adMemoryReport.filter((ad) => ad.node_id === nodeId),
                      'model_size'
                    ),
                  },
                  dfa_training: {
                    total: sumBy(
                      dfaMemoryReport.filter((ad) => ad.node_id === nodeId),
                      'model_size'
                    ),
                  },
                  trained_models: {
                    total: 3435973836,
                  },
                },
              });
            }
          });
        });
        return acc;
      }, new Map<string, NodeDeploymentStatsResponse>());

      return {
        count: nodesR.size,
        nodes: Array.from(nodesR.values()),
      };
    },
  };
}
