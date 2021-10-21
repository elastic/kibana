/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from 'kibana/server';
import { sumBy, pick } from 'lodash';
import numeral from '@elastic/numeral';
import { NodesInfoNodeInfo } from '@elastic/elasticsearch/api/types';
import type {
  NodeDeploymentStatsResponse,
  PipelineDefinition,
  NodesOverviewResponse,
} from '../../../common/types/trained_models';
import type { MlClient } from '../../lib/ml_client';
import {
  MemoryOverviewService,
  NATIVE_EXECUTABLE_CODE_OVERHEAD,
} from '../memory_overview/memory_overview_service';

export type ModelService = ReturnType<typeof modelsProvider>;

const NODE_FIELDS = [
  'attributes',
  'name',
  'roles',
  'ip',
  'host',
  'transport_address',
  'version',
] as const;

export type RequiredNodeFields = Pick<NodesInfoNodeInfo, typeof NODE_FIELDS[number]>;

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

      const {
        body: { nodes: clusterNodes },
      } = await client.asCurrentUser.nodes.stats();

      const mlNodes = Object.entries(clusterNodes).filter(([id, node]) =>
        node.roles.includes('ml')
      );

      const adMemoryReport = await memoryOverviewService.getAnomalyDetectionMemoryOverview();
      const dfaMemoryReport = await memoryOverviewService.getDFAMemoryOverview();

      // @ts-ignore
      const nodeDeploymentStatsResponses: NodeDeploymentStatsResponse[] = mlNodes.map(
        ([nodeId, node]) => {
          const nodeFields = pick(node, NODE_FIELDS);

          const allocatedModels = deploymentStats.deployment_stats.filter((v) =>
            v.nodes.some((n) => Object.keys(n.node)[0] === nodeId)
          );

          const modelsMemoryUsage = allocatedModels.map((v) => {
            return {
              model_id: v.model_id,
              // @ts-ignore
              model_size: numeral(v.model_size.toUpperCase()).value(),
            };
          });

          const memoryRes = {
            adTotalMemory: sumBy(
              adMemoryReport.filter((ad) => ad.node_id === nodeId),
              'model_size'
            ),
            dfaTotalMemory: sumBy(
              dfaMemoryReport.filter((dfa) => dfa.node_id === nodeId),
              'model_size'
            ),
            trainedModelsTotalMemory: sumBy(modelsMemoryUsage, 'model_size'),
          };

          for (const key of Object.keys(memoryRes)) {
            // @ts-ignore
            if (memoryRes[key] > 0) {
              // @ts-ignore
              memoryRes[key] += NATIVE_EXECUTABLE_CODE_OVERHEAD;
              break;
            }
          }

          return {
            id: nodeId,
            ...nodeFields,
            allocated_models: allocatedModels,
            memory_overview: {
              machine_memory: {
                // @ts-ignore
                total: Number(node.os?.mem.adjusted_total_in_bytes ?? node.os?.mem.total_in_bytes),
                jvm: Number(node.attributes['ml.max_jvm_size']),
              },
              anomaly_detection: {
                total: memoryRes.adTotalMemory,
              },
              dfa_training: {
                total: memoryRes.dfaTotalMemory,
              },
              trained_models: {
                total: memoryRes.trainedModelsTotalMemory,
                by_model: modelsMemoryUsage,
              },
            },
          };
        }
      );

      return {
        count: nodeDeploymentStatsResponses.length,
        nodes: nodeDeploymentStatsResponses,
      };
    },
  };
}
