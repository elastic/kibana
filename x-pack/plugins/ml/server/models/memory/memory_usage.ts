/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import numeral from '@elastic/numeral';
import { JobMemorySize } from '../../../common/types/trained_models';

import { JobStats } from '../../../common/types/anomaly_detection_jobs';
import { MlSavedObjectType } from '../../../common/types/saved_objects';
import { MlClient } from '../../lib/ml_client';

// @ts-expect-error numeral missing value
const AD_EXTRA_MEMORY = numeral('10MB').value();
// @ts-expect-error numeral missing value
const DFA_EXTRA_MEMORY = numeral('5MB').value();

export class JobSizeService {
  constructor(private readonly mlClient: MlClient) {}

  public async getMemorySizes(itemType?: MlSavedObjectType, node?: string, showClosedJobs = false) {
    let memories: JobMemorySize[] = [];

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
    const jobs = await this.mlClient.getJobStats();
    return jobs.jobs.map(this.getADJobMemorySize);
  }

  private async getTrainedModelsSizes() {
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

  private getADJobMemorySize(jobStats: JobStats): JobMemorySize {
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
    const text = numeral(size).format('0.000 b');
    const nodeName = jobStats.node?.name;
    return {
      id: jobStats.job_id,
      type: 'anomaly-detector',
      size,
      text,
      nodeNames: nodeName ? [nodeName] : [],
    };
  }

  private getDFAJobMemorySize(
    job: estypes.MlDataframeAnalyticsSummary,
    jobStats: estypes.MlDataframeAnalytics
  ): JobMemorySize {
    const mml = job.model_memory_limit ?? '0mb';
    // @ts-expect-error numeral missing value
    const memory = numeral(mml.toUpperCase()).value();
    const size = memory + DFA_EXTRA_MEMORY;
    const text = numeral(size).format('0.000 b');
    const nodeName = jobStats.node?.name;
    return {
      id: jobStats.id,
      type: 'data-frame-analytics',
      size,
      text,
      nodeNames: nodeName ? [nodeName] : [],
    };
  }

  private getTrainedModelMemorySize(
    trainedModel: estypes.MlTrainedModelConfig,
    trainedModelStats: estypes.MlTrainedModelStats
  ): JobMemorySize {
    const memory = trainedModelStats.model_size_stats.required_native_memory_bytes;

    const size = memory + AD_EXTRA_MEMORY;
    const text = numeral(size).format('0.000 b');
    const nodes = (trainedModelStats.deployment_stats?.nodes ??
      []) as estypes.MlTrainedModelDeploymentNodesStats[];
    return {
      id: trainedModelStats.model_id,
      type: 'trained-model',
      size,
      text,
      nodeNames: nodes.map((n) => Object.values(n.node)[0].name),
    };
  }
}

function nodeFilter(m: JobMemorySize, node?: string, showClosedJobs = false) {
  if (m.nodeNames.length === 0) {
    return showClosedJobs;
  }

  if (node === undefined) {
    return true;
  }

  return m.nodeNames.includes(node);
}
