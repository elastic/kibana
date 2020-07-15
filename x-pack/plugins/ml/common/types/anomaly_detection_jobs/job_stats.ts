/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JOB_STATE } from '../../constants/states';

export interface JobStats {
  job_id: string;
  data_counts: DataCounts;
  model_size_stats: ModelSizeStats;
  forecasts_stats: ForecastsStats;
  state: JOB_STATE;
  node: Node;
  assignment_explanation: string;
  open_time: string;
  timing_stats: TimingStats;
}

export interface DataCounts {
  job_id: string;
  processed_record_count: number;
  processed_field_count: number;
  input_bytes: number;
  input_field_count: number;
  invalid_date_count: number;
  missing_field_count: number;
  out_of_order_timestamp_count: number;
  empty_bucket_count: number;
  sparse_bucket_count: number;
  bucket_count: number;
  earliest_record_timestamp: number;
  latest_record_timestamp: number;
  last_data_time: number;
  input_record_count: number;
  latest_empty_bucket_timestamp: number;
  latest_sparse_bucket_timestamp: number;
  latest_bucket_timestamp?: number; // stat added by the UI
}

export interface ModelSizeStats {
  job_id: string;
  result_type: string;
  model_bytes: number;
  model_bytes_exceeded: number;
  model_bytes_memory_limit: number;
  peak_model_bytes?: number;
  total_by_field_count: number;
  total_over_field_count: number;
  total_partition_field_count: number;
  bucket_allocation_failures_count: number;
  memory_status: 'ok' | 'soft_limit' | 'hard_limit';
  categorized_doc_count: number;
  total_category_count: number;
  frequent_category_count: number;
  rare_category_count: number;
  dead_category_count: number;
  categorization_status: 'ok' | 'warn';
  log_time: number;
  timestamp: number;
}

export interface ForecastsStats {
  total: number;
  forecasted_jobs: number;
  memory_bytes?: any;
  records?: any;
  processing_time_ms?: any;
  status?: any;
}

export interface Node {
  id: string;
  name: string;
  ephemeral_id: string;
  transport_address: string;
  attributes: {
    'transform.remote_connect'?: boolean;
    'ml.machine_memory'?: number;
    'xpack.installed'?: boolean;
    'transform.node'?: boolean;
    'ml.max_open_jobs'?: number;
  };
}

interface TimingStats {
  job_id: string;
  bucket_count: number;
  total_bucket_processing_time_ms: number;
  minimum_bucket_processing_time_ms: number;
  maximum_bucket_processing_time_ms: number;
  average_bucket_processing_time_ms: number;
  exponential_average_bucket_processing_time_ms: number;
  exponential_average_bucket_processing_time_per_hour_ms: number;
}
