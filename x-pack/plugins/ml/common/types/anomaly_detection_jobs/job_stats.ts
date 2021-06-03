/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export type JobStats = estypes.MlJobStats & {
  model_size_stats: ModelSizeStats;
  timing_stats: TimingStats;
};

export type DataCounts = estypes.MlDataCounts;

export type ModelSizeStats = estypes.MlModelSizeStats & {
  model_bytes_exceeded: number;
  model_bytes_memory_limit: number;
  peak_model_bytes?: number;
};

export type TimingStats = estypes.MlTimingStats & {
  total_bucket_processing_time_ms: number;
};

export type ForecastsStats = estypes.MlJobForecastStatistics;

export type Node = estypes.MlDiscoveryNode;
