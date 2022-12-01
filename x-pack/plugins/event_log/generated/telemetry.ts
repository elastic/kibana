/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

export interface EventUsageSchema {
  event_duration: AvgAggSchema;
  kibana_task_schedule_delay: AvgAggSchema;
  number_of_triggered_actions: AvgAggSchema;
  number_of_generated_actions: PercentileAggSchema;
  alert_counts_active: PercentileAggSchema;
  alert_counts_new: AvgAggSchema;
  alert_counts_recovered: AvgAggSchema;
  number_of_searches: AvgAggSchema;
  total_indexing_duration_ms: AvgAggSchema;
  es_search_duration_ms: AvgAggSchema;
  total_search_duration_ms: AvgAggSchema;
  execution_gap_duration_s: AvgAggSchema;
  rule_type_run_duration_ms: AvgAggSchema;
  process_alerts_duration_ms: AvgAggSchema;
  trigger_actions_duration_ms: AvgAggSchema;
  process_rule_duration_ms: AvgAggSchema;
  claim_to_start_duration_ms: AvgAggSchema;
  prepare_rule_duration_ms: AvgAggSchema;
  total_run_duration_ms: AvgAggSchema;
  total_enrichment_duration_ms: AvgAggSchema;
}

export type AvgAggSchema = number;
export interface PercentileAggSchema {
  p50: number;
  p90: number;
  p99: number;
}
