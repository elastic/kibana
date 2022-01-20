/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface RuleSearchBody {
  query: {
    bool: {
      filter: {
        terms: { [key: string]: string[] };
      };
    };
  };
}

export interface RuleSearchParams {
  body: RuleSearchBody;
  filter_path: string[];
  ignore_unavailable: boolean;
  index: string;
  size: number;
}

export interface RuleSearchResult {
  alert: {
    name: string;
    enabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    muteAll: boolean | undefined | null;
    params: DetectionRuleParms;
    actions: unknown[];
  };
}

export interface DetectionsMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

interface DetectionRuleParms {
  ruleId: string;
  version: string;
  type: string;
}

interface FeatureUsage {
  enabled: number;
  disabled: number;
}

interface FeatureTypeUsage {
  enabled: number;
  disabled: number;
  alerts: number;
  cases: number;
  legacy_notifications_enabled: number;
  legacy_notifications_disabled: number;
  notifications_enabled: number;
  notifications_disabled: number;
}
export interface DetectionRulesTypeUsage {
  query: FeatureTypeUsage;
  threshold: FeatureTypeUsage;
  eql: FeatureTypeUsage;
  machine_learning: FeatureTypeUsage;
  threat_match: FeatureTypeUsage;
  elastic_total: FeatureTypeUsage;
  custom_total: FeatureTypeUsage;
}

export interface MlJobsUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface DetectionsUsage {
  ml_jobs: MlJobsUsage;
}

export interface DetectionMetrics {
  ml_jobs: MlJobUsage;
  detection_rules: DetectionRuleAdoption;
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

export interface DetectionRuleMetric {
  rule_name: string;
  rule_id: string;
  rule_type: string;
  rule_version: number;
  enabled: boolean;
  elastic_rule: boolean;
  created_on: string;
  updated_on: string;
  alert_count_daily: number;
  cases_count_total: number;
  has_legacy_notification: boolean;
  has_notification: boolean;
}

export interface AlertsAggregationResponse {
  hits: {
    total: { value: number };
  };
  aggregations: {
    [aggName: string]: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

export interface CasesSavedObject {
  type: string;
  alertId: string;
  index: string;
  rule: {
    id: string;
    name: string;
  };
}

export interface MlJobUsage {
  ml_job_usage: MlJobsUsage;
  ml_job_metrics: MlJobMetric[];
}

export interface DetectionRuleAdoption {
  detection_rule_detail: DetectionRuleMetric[];
  detection_rule_usage: DetectionRulesTypeUsage;
}
