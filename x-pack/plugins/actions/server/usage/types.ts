/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ActionsUsage {
  enabled: boolean;
  count_total: number;
  count_active_total: number;
  executions_total: number;
  count_by_type: Record<string, number>;
  count_active_by_type: Record<string, number>;
  executions_by_type: Record<string, number>;
}

export interface ActionsTelemetry {
  excutions_count_by_type: Record<string, number>;
}

export interface ActionsTelemetrySavedObject {
  attributes: ActionsTelemetry;
}
