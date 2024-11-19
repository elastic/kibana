/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface ITaskMetricsService {
  start(name: string): Trace;
  end(trace: Trace, error?: Error): Promise<void>;
  createTaskMetric(trace: Trace, error?: Error): TaskMetric;
}

export interface Trace {
  name: string;
  startedAt: number;
}

export interface TaskMetric {
  name: string;
  passed: boolean;
  time_executed_in_ms: number;
  start_time: number;
  end_time: number;
  error_message?: string;
}
