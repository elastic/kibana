/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import numeral from '@elastic/numeral';
import { pick } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import type { MlFeatures } from '../../../common/constants/app';
import type {
  MemoryUsageInfo,
  TrainedModelStatsResponse,
  MemoryStatsResponse,
} from '../../../common/types/trained_models';

import type { JobStats } from '../../../common/types/anomaly_detection_jobs';
import type { MlSavedObjectType } from '../../../common/types/saved_objects';
import type { MlClient } from '../../lib/ml_client';
import type {
  NodeDeploymentStatsResponse,
  NodesOverviewResponse,
} from '../../../common/types/trained_models';

// @ts-expect-error numeral missing value
const AD_EXTRA_MEMORY = numeral('10MB').value();
// @ts-expect-error numeral missing value
const DFA_EXTRA_MEMORY = numeral('5MB').value();

const NODE_FIELDS = ['attributes', 'name', 'roles'] as const;

export type RequiredNodeFields = Pick<estypes.NodesInfoNodeInfo, (typeof NODE_FIELDS)[number]>;

export class MemoryUsageService {
  constructor(private readonly mlClient: MlClient, private readonly mlFeatures: MlFeatures) {}

  public async getMemorySizes(itemType?: MlSavedObjectType, node?: string, showClosedJobs = false) {
    let memories: MemoryUsageInfo[] = [];

    switch (itemType) {
      case 'anomaly-detector':
        memories = await this.getADJobsSizes();
        break;
      case 'data-frame-analytics':
        memories = await this.getDFAJobsSizes();
        break;
      case 'trained-model':
        memories = await this.getTrainedModelsSizes();
        break;
      default:
        memories = [
          ...(await this.getADJobsSizes()),
          ...(await this.getDFAJobsSizes()),
          ...(await this.getTrainedModelsSizes()),
        ];
        break;
    }
    return memories.filter((m) => nodeFilter(m, node, showClosedJobs));
  }

  private async getADJobsSizes() {
    if (this.mlFeatures.ad === false) {
      return [];
    }

    const jobs = await this.mlClient.getJobStats();
    return jobs.jobs.map(this.getADJobMemorySize);
  }

  private async getTrainedModelsSizes() {
    if (this.mlFeatures.nlp === false) {
      return [];
    }

    const [models, stats] = await Promise.all([
      this.mlClient.getTrainedModels(),
      this.mlClient.getTrainedModelsStats(),
    ]);
    const statsMap = stats.trained_model_stats.reduce<Record<string, estypes.MlTrainedModelStats>>(
      (acc, cur) => {
        acc[cur.model_id] = cur;
        return acc;
      },
      {}
    );

    return models.trained_model_configs.map((m) =>
      this.getTrainedModelMemorySize(m, statsMap[m.model_id])
    );
  }

  private async getDFAJobsSizes() {
    if (this.mlFeatures.dfa === false) {
      return [];
    }

    const [jobs, jobsStats] = await Promise.all([
      this.mlClient.getDataFrameAnalytics(),
      this.mlClient.getDataFrameAnalyticsStats(),
    ]);
    const statsMap = jobsStats.data_frame_analytics.reduce<
      Record<string, estypes.MlDataframeAnalytics>
    >((acc, cur) => {
      acc[cur.id] = cur;
      return acc;
    }, {});

    return jobs.data_frame_analytics.map((j) => this.getDFAJobMemorySize(j, statsMap[j.id]));
  }

  private getADJobMemorySize(jobStats: JobStats): MemoryUsageInfo {
    let memory = 0;
    switch (jobStats.model_size_stats.assignment_memory_basis) {
      case 'model_memory_limit':
        memory = (jobStats.model_size_stats.model_bytes_memory_limit as number) ?? 0;
        break;
      case 'current_model_bytes':
        memory = jobStats.model_size_stats.model_bytes as number;
        break;
      case 'peak_model_bytes':
        memory = (jobStats.model_size_stats.peak_model_bytes as number) ?? 0;
        break;
    }

    const size = memory + AD_EXTRA_MEMORY;
    const nodeName = jobStats.node?.name;
    return {
      id: jobStats.job_id,
      type: 'anomaly-detector',
      size,
      nodeNames: nodeName ? [nodeName] : [],
    };
  }

  private getDFAJobMemorySize(
    job: estypes.MlDataframeAnalyticsSummary,
    jobStats: estypes.MlDataframeAnalytics
  ): MemoryUsageInfo {
    const mml = job.model_memory_limit ?? '0mb';
    // @ts-expect-error numeral missing value
    const memory = numeral(mml.toUpperCase()).value();
    const size = memory + DFA_EXTRA_MEMORY;
    const nodeName = jobStats.node?.name;
    return {
      id: jobStats.id,
      type: 'data-frame-analytics',
      size,
      nodeNames: nodeName ? [nodeName] : [],
    };
  }

  private getTrainedModelMemorySize(
    trainedModel: estypes.MlTrainedModelConfig,
    trainedModelStats: estypes.MlTrainedModelStats
  ): MemoryUsageInfo {
    const memory = trainedModelStats.model_size_stats.required_native_memory_bytes;

    const size = memory + AD_EXTRA_MEMORY;
    const nodes = (trainedModelStats.deployment_stats?.nodes ??
      []) as estypes.MlTrainedModelDeploymentNodesStats[];
    return {
      id: trainedModelStats.model_id,
      type: 'trained-model',
      size,
      nodeNames: nodes.map((n) => Object.values(n.node)[0].name),
    };
  }

  /**
   * Provides the ML nodes overview with allocated models.
   */
  async getNodesOverview(): Promise<NodesOverviewResponse> {
    // TODO set node_id to ml:true when elasticsearch client is updated.
    const response = (await this.mlClient.getMemoryStats()) as MemoryStatsResponse;

    const { trained_model_stats: trainedModelStats } = await this.mlClient.getTrainedModelsStats({
      size: 10000,
    });

    const mlNodes = Object.entries(response.nodes).filter(([, node]) => node.roles.includes('ml'));

    // @ts-expect-error `throughput_last_minute` is not declared in ES Types
    const nodeDeploymentStatsResponses: NodeDeploymentStatsResponse[] = mlNodes.map(
      ([nodeId, node]) => {
        const nodeFields = pick(node, NODE_FIELDS) as RequiredNodeFields;

        nodeFields.attributes = nodeFields.attributes;

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
              key: `${rest.deployment_id}_${node.name}`,
            };
          });

        const modelsMemoryUsage = allocatedModels.map((v) => {
          return {
            model_id: v.model_id,
            model_size: v.required_native_memory_bytes,
          };
        });

        const memoryRes = {
          adTotalMemory: node.mem.ml.anomaly_detectors_in_bytes,
          dfaTotalMemory: node.mem.ml.data_frame_analytics_in_bytes,
          trainedModelsTotalMemory: node.mem.ml.native_inference_in_bytes,
        };

        for (const key of Object.keys(memoryRes)) {
          if (memoryRes[key as keyof typeof memoryRes] > 0) {
            /**
             * The amount of memory needed to load the ML native code shared libraries. The assumption is that the first
             * ML job to run on a given node will do this, and then subsequent ML jobs on the same node will reuse the
             * same already-loaded code.
             */
            memoryRes[key as keyof typeof memoryRes] += node.mem.ml.native_code_overhead_in_bytes;
            break;
          }
        }

        return {
          id: nodeId,
          ...nodeFields,
          allocated_models: allocatedModels,
          memory_overview: {
            machine_memory: {
              total: node.mem.adjusted_total_in_bytes,
              jvm: node.jvm.heap_max_in_bytes,
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
            ml_max_in_bytes: node.mem.ml.max_in_bytes,
          },
        };
      }
    );

    return {
      // TODO preserve _nodes from the response when getMemoryStats method is updated to support ml:true filter
      _nodes: {
        ...response._nodes,
        total: mlNodes.length,
        successful: mlNodes.length,
      },
      nodes: nodeDeploymentStatsResponses,
    };
  }
}

function nodeFilter(m: MemoryUsageInfo, node?: string, showClosedJobs = false) {
  if (m.nodeNames.length === 0) {
    return showClosedJobs;
  }

  if (node === undefined) {
    return true;
  }

  return m.nodeNames.includes(node);
}
