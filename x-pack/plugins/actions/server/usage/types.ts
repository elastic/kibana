/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ActionsUsage {
  alert_history_connector_enabled: boolean;
  count_total: number;
  count_active_total: number;
  count_active_alert_history_connectors: number;
  count_by_type: Record<string, number>;
  count_active_by_type: Record<string, number>;
  // TODO: Implement executions count telemetry with eventLog, when it will write to index
  // executions_by_type: Record<string, number>;
  // executions_total: number;
}
