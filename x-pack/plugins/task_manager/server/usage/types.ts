/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TaskManagerUsage {
  task_type_exclusion: string[];
  ephemeral_tasks_enabled: boolean;
  ephemeral_request_capacity: number;
  ephemeral_stats: {
    status: string;
    queued_tasks: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    load: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    executions_per_cycle: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  failed_tasks: number;
}
