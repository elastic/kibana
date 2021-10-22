/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertsUsage {
  count_total: number;
  count_active_total: number;
  count_disabled_total: number;
  count_by_type: Record<string, number>;
  count_active_by_type: Record<string, number>;
  count_rules_namespaces: number;
  count_rules_executions: number;
  count_rules_executions_by_type: Record<string, number>;
  count_rules_executions_failured: number;
  count_rules_executions_failured_by_reason: Record<string, number>;
  count_rules_executions_failured_by_reason_by_type: Record<string, Record<string, number>>;
  avg_execution_time: number;
  avg_execution_time_by_type: Record<string, number>;
  throttle_time: {
    min: number;
    avg: number;
    max: number;
  };
  schedule_time: {
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
