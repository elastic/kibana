/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlConfig } from '../custom_urls';
import { CREATED_BY_LABEL } from '../../constants/new_job';

export type JobId = string;
export type BucketSpan = string;

export interface CustomSettings {
  custom_urls?: UrlConfig[];
  created_by?: CREATED_BY_LABEL;
  job_tags?: {
    [tag: string]: string;
  };
}

export interface Job {
  job_id: JobId;
  analysis_config: AnalysisConfig;
  analysis_limits?: AnalysisLimits;
  background_persist_interval?: string;
  custom_settings?: CustomSettings;
  data_description: DataDescription;
  description: string;
  groups: string[];
  model_plot_config?: ModelPlotConfig;
  model_snapshot_retention_days?: number;
  daily_model_snapshot_retention_after_days?: number;
  renormalization_window_days?: number;
  results_index_name?: string;
  results_retention_days?: number;

  // optional properties added when the job has been created
  create_time?: number;
  finished_time?: number;
  job_type?: 'anomaly_detector';
  job_version?: string;
  model_snapshot_id?: string;
  deleting?: boolean;
}

export interface AnalysisConfig {
  bucket_span: BucketSpan;
  categorization_field_name?: string;
  categorization_filters?: string[];
  categorization_analyzer?: object | string;
  detectors: Detector[];
  influencers: string[];
  latency?: number;
  multivariate_by_fields?: boolean;
  summary_count_field_name?: string;
  per_partition_categorization?: PerPartitionCategorization;
}

export interface Detector {
  by_field_name?: string;
  detector_description?: string;
  detector_index?: number;
  exclude_frequent?: string;
  field_name?: string;
  function: string;
  over_field_name?: string;
  partition_field_name?: string;
  use_null?: boolean;
  custom_rules?: CustomRule[];
}
export interface AnalysisLimits {
  categorization_examples_limit?: number;
  model_memory_limit: string;
}

export interface DataDescription {
  format?: string;
  time_field: string;
  time_format?: string;
}

export interface ModelPlotConfig {
  enabled?: boolean;
  annotations_enabled?: boolean;
  terms?: string;
}

// TODO, finish this when it's needed
export interface CustomRule {
  actions: string[];
  scope?: object;
  conditions: any[];
}

export interface PerPartitionCategorization {
  enabled: boolean;
  stop_on_warn?: boolean;
}
