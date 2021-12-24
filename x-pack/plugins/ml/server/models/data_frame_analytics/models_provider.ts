/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from 'kibana/server';
import { sumBy, pick } from 'lodash';
import {
  MlTrainedModelStats,
  NodesInfoNodeInfo,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
import {
  TrainedModelDeploymentStatsResponse,
  TrainedModelModelSizeStats,
} from '../../../common/types/trained_models';
import { isDefined } from '../../../common/types/guards';
import { isPopulatedObject } from '../../../common';

export type ModelService = ReturnType<typeof modelsProvider>;

const NODE_FIELDS = ['attributes', 'name', 'roles', 'version'] as const;

export type RequiredNodeFields = Pick<NodesInfoNodeInfo, typeof NODE_FIELDS[number]>;

interface TrainedModelStatsResponse extends MlTrainedModelStats {
  deployment_stats?: Omit<TrainedModelDeploymentStatsResponse, 'model_id'>;
  model_size_stats?: TrainedModelModelSizeStats;
}

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

      try {
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
     * Provides the ML nodes overview with allocated models.
     */
    async getNodesOverview(): Promise<NodesOverviewResponse> {
      if (!memoryOverviewService) {
        throw new Error('Memory overview service is not provided');
      }

      const {
        body: { trained_model_stats: trainedModelStats },
      } = await mlClient.getTrainedModelsStats({
        model_id: '_all',
        size: 10000,
      });

      const {
        body: { nodes: clusterNodes },
      } = await client.asInternalUser.nodes.stats();

      const mlNodes = Object.entries(clusterNodes).filter(([, node]) => node.roles?.includes('ml'));

      const adMemoryReport = await memoryOverviewService.getAnomalyDetectionMemoryOverview();
      const dfaMemoryReport = await memoryOverviewService.getDFAMemoryOverview();

      const nodeDeploymentStatsResponses: NodeDeploymentStatsResponse[] = mlNodes.map(
        ([nodeId, node]) => {
          const nodeFields = pick(node, NODE_FIELDS) as RequiredNodeFields;

          nodeFields.attributes = isPopulatedObject(nodeFields.attributes)
            ? Object.fromEntries(
                Object.entries(nodeFields.attributes).filter(([id]) => id.startsWith('ml'))
              )
            : nodeFields.attributes;

          const allocatedModels = (trainedModelStats as TrainedModelStatsResponse[])
            .filter(
              (d) =>
                isDefined(d.deployment_stats) &&
                isDefined(d.deployment_stats.nodes) &&
                d.deployment_stats.nodes.some((n) => Object.keys(n.node)[0] === nodeId)
            )
            .map((d) => {
              const modelSizeState = d.model_size_stats;
              const deploymentStats = d.deployment_stats;

              if (!deploymentStats || !modelSizeState) {
                throw new Error('deploymentStats or modelSizeState not defined');
              }

              const { nodes, ...rest } = deploymentStats;

              const { node: tempNode, ...nodeRest } = nodes.find(
                (v) => Object.keys(v.node)[0] === nodeId
              )!;
              return {
                model_id: d.model_id,
                ...rest,
                ...modelSizeState,
                node: nodeRest,
              };
            });

          const modelsMemoryUsage = allocatedModels.map((v) => {
            return {
              model_id: v.model_id,
              model_size: v.required_native_memory_bytes,
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
            if (memoryRes[key as keyof typeof memoryRes] > 0) {
              /**
               * The amount of memory needed to load the ML native code shared libraries. The assumption is that the first
               * ML job to run on a given node will do this, and then subsequent ML jobs on the same node will reuse the
               * same already-loaded code.
               */
              memoryRes[key as keyof typeof memoryRes] += NATIVE_EXECUTABLE_CODE_OVERHEAD;
              break;
            }
          }

          return {
            id: nodeId,
            ...nodeFields,
            allocated_models: allocatedModels,
            memory_overview: {
              machine_memory: {
                // TODO remove ts-ignore when elasticsearch client is updated
                // @ts-ignore
                total: Number(node.os?.mem.adjusted_total_in_bytes ?? node.os?.mem.total_in_bytes),
                jvm: Number(node.attributes!['ml.max_jvm_size']),
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
