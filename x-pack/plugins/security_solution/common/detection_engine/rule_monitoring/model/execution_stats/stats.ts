/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import type { LogLevel } from '../log_level';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

export interface RuleExecutionStats {
  number_of_executions: NumberOfExecutions;
  number_of_logged_messages: NumberOfLoggedMessages;
  number_of_detected_gaps: NumberOfDetectedGaps;
  schedule_delay_ms: AggregatedMetric<number>;
  execution_duration_ms: AggregatedMetric<number>;
  search_duration_ms: AggregatedMetric<number>;
  indexing_duration_ms: AggregatedMetric<number>;
  top_errors?: TopMessages;
  top_warnings?: TopMessages;
}

export interface NumberOfExecutions {
  total: number;
  by_outcome: Record<RuleLastRunOutcomes, number>;
}

export interface NumberOfLoggedMessages {
  total: number;
  by_level: Record<LogLevel, number>;
}

export interface NumberOfDetectedGaps {
  total: number;
  total_duration_s: number;
}

export interface AggregatedMetric<T> {
  percentiles: Percentiles<T>;
}

export type Percentiles<T> = Record<string, T>;

export type TopMessages = Array<{
  count: number;
  message: string;
}>;
