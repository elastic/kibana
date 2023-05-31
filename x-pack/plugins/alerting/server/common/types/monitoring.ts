/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleLastRunAttributes } from './status';

export interface RuleMonitoringHistoryAttributes {
  success: boolean;
  timestamp: number;
  duration?: number;
  outcome?: RuleLastRunAttributes;
}

export interface RuleMonitoringCalculatedMetricsAttributes {
  p50?: number;
  p95?: number;
  p99?: number;
  success_ratio: number;
}

export interface RuleMonitoringLastRunMetricsAttributes {
  duration?: number;
  total_search_duration_ms?: number | null;
  total_indexing_duration_ms?: number | null;
  total_alerts_detected?: number | null;
  total_alerts_created?: number | null;
  gap_duration_s?: number | null;
}

export interface RuleMonitoringLastRunAttributes {
  timestamp: string;
  metrics: RuleMonitoringLastRunMetricsAttributes;
}

export interface RuleMonitoringAttributes {
  run: {
    history: RuleMonitoringHistoryAttributes[];
    calculated_metrics: RuleMonitoringCalculatedMetricsAttributes;
    last_run: RuleMonitoringLastRunAttributes;
  };
}
