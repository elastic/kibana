/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import type { LogLevel } from '../log_level';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

// -------------------------------------------------------------------------------------------------
// Stats history (date histogram)

export interface StatsHistory<TStats> {
  buckets: Array<StatsBucket<TStats>>;
}

export interface StatsBucket<TStats> {
  timestamp: IsoDateString;
  stats: TStats;
}

// -------------------------------------------------------------------------------------------------
// Rule stats

// TODO: https://github.com/elastic/kibana/issues/125642 Add more stats, such as:
// - number of Kibana instances
// - number of Kibana spaces
// - number of rules with exceptions
// - number of rules with notification actions (total, normal, legacy)
// - number of rules with response actions
// - top X last failed status messages + rule ids for each status
// - top X last partial failure status messages + rule ids for each status
// - top X slowest rules by any metrics (last total execution time, search time, indexing time, etc)
// - top X rules with the largest schedule delay (drift)

export interface RuleStats {
  number_of_rules: NumberOfRules;
}

export interface NumberOfRules {
  all: TotalEnabledDisabled;
  by_origin: Record<'prebuilt' | 'custom', TotalEnabledDisabled>;
  by_type: Record<string, TotalEnabledDisabled>;
  by_outcome: Record<string, TotalEnabledDisabled>;
}

export interface TotalEnabledDisabled {
  total: number;
  enabled: number;
  disabled: number;
}

// -------------------------------------------------------------------------------------------------
// Rule execution stats

// TODO: https://github.com/elastic/kibana/issues/125642 Add more stats, such as:
// - number of detected alerts (source event "hits")
// - number of created alerts (those we wrote to the .alerts-* index)
// - number of times rule hit cirquit breaker, number of not created alerts because of that
// - number of triggered actions
// - top gaps

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
