/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TaskManagerUsage {
  task_type_exclusion: string[];
  failed_tasks: number;
  recurring_tasks: {
    actual_service_time: number;
    adjusted_service_time: number;
  };
  adhoc_tasks: {
    actual_service_time: number;
    adjusted_service_time: number;
  };
  capacity: number;
}
