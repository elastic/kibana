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
  connectors_per_alert: {
    min: number;
    avg: number;
    max: number;
  };
}
