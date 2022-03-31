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
  'num_scheduled_actions',
] as const;

export type ExecutionLogSortFields = typeof executionLogSortableColumns[number];

export interface IExecutionLog {
  id: string;
  timestamp: string;
  duration_ms: number;
  status: string;
  message: string;
  num_active_alerts: number;
  num_new_alerts: number;
  num_recovered_alerts: number;
  num_triggered_actions: number;
  num_scheduled_actions: number;
  num_succeeded_actions: number;
  num_errored_actions: number;
  total_search_duration_ms: number;
  es_search_duration_ms: number;
  schedule_delay_ms: number;
  timed_out: boolean;
}

export interface IExecutionLogResult {
  total: number;
  data: IExecutionLog[];
}
