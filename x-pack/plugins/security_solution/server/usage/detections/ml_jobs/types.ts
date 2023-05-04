/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MlDataCounts,
  MlDatafeedState,
  MlDatafeedStats,
  MlDatafeedTimingStats,
  MlJob,
  MlJobState,
  MlJobStats,
  MlJobTimingStats,
  MlModelSizeStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface FeatureUsage {
  enabled: number;
  disabled: number;
}

export interface MlJobUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface MlJobMetric {
  job_id: MlJobStats['job_id'];
  create_time?: MlJob['create_time'];
  finished_time?: MlJob['finished_time'];
  open_time?: MlJobStats['open_time'];
  state: MlJobState;
  data_counts: Partial<MlDataCounts>;
  model_size_stats: Partial<MlModelSizeStats>;
  timing_stats: Partial<MlJobTimingStats>;
  datafeed: MlDataFeed;
}

export interface MlJobUsageMetric {
  ml_job_usage: MlJobUsage;
  ml_job_metrics: MlJobMetric[];
}

export interface DetectionsMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

export interface MlDataFeed {
  datafeed_id?: MlDatafeedStats['datafeed_id'];
  state?: MlDatafeedState;
  timing_stats: Partial<MlDatafeedTimingStats>;
}
