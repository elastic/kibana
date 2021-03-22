/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../../src/core/server';
import {
  getMlJobsUsage,
  getMlJobMetrics,
  getRulesUsage,
  initialRulesUsage,
  initialMlJobsUsage,
} from './detections_helpers';
import { MlPluginSetup } from '../../../../ml/server';

interface FeatureUsage {
  enabled: number;
  disabled: number;
}

export interface DetectionRulesUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface MlJobsUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface DetectionsUsage {
  detection_rules: DetectionRulesUsage;
  ml_jobs: MlJobsUsage;
}

export interface DetectionMetrics {
  ml_jobs: MlJobMetric[];
}

export interface MlJobDataCount {
  bucket_count: number;
  empty_bucket_count: number;
  input_bytes: number;
  input_record_count: number;
  last_data_time: number;
  processed_record_count: number;
}

export interface MlJobModelSize {
  bucket_allocation_failures_count: number;
  memory_status: string;
  model_bytes: number;
  model_bytes_exceeded: number;
  model_bytes_memory_limit: number;
  peak_model_bytes: number;
}

export interface MlTimingStats {
  average_bucket_processing_time_ms: number;
  bucket_count: number;
  exponential_average_bucket_processing_time_ms: number;
  exponential_average_bucket_processing_time_per_hour_ms: number;
  maximum_bucket_processing_time_ms: number;
  minimum_bucket_processing_time_ms: number;
  total_bucket_processing_time_ms: number;
}

export interface MlJobMetric {
  job_id: string;
  open_time: string;
  state: string;
  data_counts: MlJobDataCount;
  model_size_stats: MlJobModelSize;
  timing_stats: MlTimingStats;
}

export const defaultDetectionsUsage = {
  detection_rules: initialRulesUsage,
  ml_jobs: initialMlJobsUsage,
};

export const fetchDetectionsUsage = async (
  kibanaIndex: string,
  esClient: ElasticsearchClient,
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionsUsage> => {
  const [rulesUsage, mlJobsUsage] = await Promise.allSettled([
    getRulesUsage(kibanaIndex, esClient),
    getMlJobsUsage(ml, savedObjectClient),
  ]);

  return {
    detection_rules: rulesUsage.status === 'fulfilled' ? rulesUsage.value : initialRulesUsage,
    ml_jobs: mlJobsUsage.status === 'fulfilled' ? mlJobsUsage.value : initialMlJobsUsage,
  };
};

export const fetchDetectionsMetrics = async (
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionMetrics> => {
  const [mlJobMetrics] = await Promise.allSettled([getMlJobMetrics(ml, savedObjectClient)]);

  return {
    ml_jobs: mlJobMetrics.status === 'fulfilled' ? mlJobMetrics.value : [],
  };
};
