/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const executionLogSortableColumns = [
  'timestamp',
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
  'num_triggered_actions',
  'num_generated_actions',
  'num_active_alerts',
  'num_recovered_alerts',
  'num_new_alerts',
] as const;

export const actionErrorLogSortableColumns = [
  '@timestamp',
  'event.start',
  'event.end',
  'event.duration',
  'event.action',
];

export const EMPTY_EXECUTION_KPI_RESULT = {
  success: 0,
  unknown: 0,
  failure: 0,
  warning: 0,
  activeAlerts: 0,
  newAlerts: 0,
  recoveredAlerts: 0,
  erroredActions: 0,
  triggeredActions: 0,
};

export type ExecutionLogSortFields = (typeof executionLogSortableColumns)[number];

export type ActionErrorLogSortFields = (typeof actionErrorLogSortableColumns)[number];

export interface IExecutionLog {
  id: string;
  timestamp: string;
  duration_ms: number;
  status: string;
  message: string;
  version: string;
  num_active_alerts: number;
  num_new_alerts: number;
  num_recovered_alerts: number;
  num_triggered_actions: number;
  num_generated_actions: number;
  num_succeeded_actions: number;
  num_errored_actions: number;
  total_search_duration_ms: number;
  es_search_duration_ms: number;
  schedule_delay_ms: number;
  timed_out: boolean;
  rule_id: string;
  space_ids: string[];
  rule_name: string;
  maintenance_window_ids: string[];
}

export interface IExecutionErrors {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export interface IExecutionErrorsResult {
  totalErrors: number;
  errors: IExecutionErrors[];
}

export interface IExecutionLogResult {
  total: number;
  data: IExecutionLog[];
}

export type IExecutionKPIResult = typeof EMPTY_EXECUTION_KPI_RESULT;
