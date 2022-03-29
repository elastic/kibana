/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertingUsage {
  count_total: number;
  count_active_total: number;
  count_disabled_total: number;
  count_by_type: Record<string, number>;
  count_active_by_type: Record<string, number>;
  count_rules_namespaces: number;
  count_rules_executions_per_day: number;
  count_rules_executions_by_type_per_day: Record<string, number>;
  count_rules_executions_failured_per_day: number;
  count_rules_executions_failured_by_reason_per_day: Record<string, number>;
  count_rules_executions_failured_by_reason_by_type_per_day: Record<string, Record<string, number>>;
  count_rules_executions_timeouts_per_day: number;
  count_rules_executions_timeouts_by_type_per_day: Record<string, number>;
  count_failed_and_unrecognized_rule_tasks_per_day: number;
  count_failed_and_unrecognized_rule_tasks_by_status_per_day: Record<string, number>;
  count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: Record<
    string,
    Record<string, number>
  >;
  percentile_num_scheduled_actions_per_day: {
    p50: number;
    p90: number;
    p99: number;
  };
  avg_execution_time_per_day: number;
  avg_execution_time_by_type_per_day: Record<string, number>;
  avg_es_search_duration_per_day: number;
  avg_es_search_duration_by_type_per_day: Record<string, number>;
  avg_total_search_duration_per_day: number;
  avg_total_search_duration_by_type_per_day: Record<string, number>;
  throttle_time: {
    min: string;
    avg: string;
    max: string;
  };
  schedule_time: {
    min: string;
    avg: string;
    max: string;
  };
  throttle_time_number_s: {
    min: number;
    avg: number;
    max: number;
  };
  schedule_time_number_s: {
    min: number;
    avg: number;
    max: number;
  };
  connectors_per_alert: {
    min: number;
    avg: number;
    max: number;
  };
}
