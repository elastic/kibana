/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import type { LogLevel } from '../../model';

// -------------------------------------------------------------------------------------------------
// History of health stats (date histogram)

/**
 * History of change of a set of stats over a time interval. The interval is split into discreet buckets,
 * each bucket is a smaller sub-interval with stats calculated over this sub-interval.
 *
 * This model corresponds to the `date_histogram` aggregation of Elasticsearch:
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-datehistogram-aggregation.html
 */
export interface HealthHistory<TStats> {
  buckets: Array<HealthBucket<TStats>>;
}

/**
 * Sub-interval with stats calculated over it.
 */
export interface HealthBucket<TStats> {
  /**
   * Start timestamp of the sub-interval.
   */
  timestamp: IsoDateString;

  /**
   * Set of stats.
   */
  stats: TStats;
}

// -------------------------------------------------------------------------------------------------
// Health overview state

// TODO: https://github.com/elastic/kibana/issues/125642 Add more data, see health_data.md

/**
 * "Static" health state at the moment of the API call. Calculated for a set of rules.
 * Example: number of enabled and disabled rules.
 */
export interface HealthOverviewState {
  /**
   * Various counts of different rules.
   */
  number_of_rules: NumberOfRules;
}

/**
 * Various counts of different rules.
 */
export interface NumberOfRules {
  /**
   * Total number of all rules, and how many of them are enabled and disabled.
   */
  all: TotalEnabledDisabled;

  /**
   * Number of prebuilt and custom rules, and how many of them are enabled and disabled.
   */
  by_origin: Record<'prebuilt' | 'custom', TotalEnabledDisabled>;

  /**
   * Number of rules of each type, and how many of them are enabled and disabled.
   */
  by_type: Record<string, TotalEnabledDisabled>;

  /**
   * Number of rules by last execution outcome, and how many of them are enabled and disabled.
   */
  by_outcome: Record<string, TotalEnabledDisabled>;
}

/**
 * Number of rules in a given set, and how many of them are enabled and disabled.
 */
export interface TotalEnabledDisabled {
  /**
   * Total number of rules in a set.
   */
  total: number;

  /**
   * Number of enabled rules in a set.
   */
  enabled: number;

  /**
   * Number of disabled rules in a set.
   */
  disabled: number;
}

// -------------------------------------------------------------------------------------------------
// Health overview stats

// TODO: https://github.com/elastic/kibana/issues/125642 Add more data, see health_data.md

/**
 * "Dynamic" health stats over a specified "health interval". Can be calculated either
 * for a set of rules or for a single rule.
 */
export interface HealthOverviewStats {
  /**
   * Number of rule executions.
   */
  number_of_executions: NumberOfExecutions;

  /**
   * Number of events containing some message that were written to the Event Log.
   */
  number_of_logged_messages: NumberOfLoggedMessages;

  /**
   * Stats for detected gaps in rule execution.
   */
  number_of_detected_gaps: NumberOfDetectedGaps;

  /**
   * Aggregated schedule delay of a rule, in milliseconds.
   * Also called "drift" in the Task Manager health API.
   * This metric shows if rules start executing on time according to their schedule
   * (in that case, it should be ideally zero, but in practice will be 3-5 seconds),
   * or their start time gets delayed (when the cluster is overloaded it could be
   * minutes or even hours).
   */
  schedule_delay_ms: AggregatedMetric<number>;

  /**
   * Aggregated total execution duration of a rule, in milliseconds.
   */
  execution_duration_ms: AggregatedMetric<number>;

  /**
   * Aggregated total search duration of a rule, in milliseconds.
   * This metric shows how much time a rule spends for querying source indices.
   */
  search_duration_ms: AggregatedMetric<number>;

  /**
   * Aggregated total indexing duration of a rule, in milliseconds.
   * This metric shows how much time a rule spends for writing generated alerts.
   */
  indexing_duration_ms: AggregatedMetric<number>;

  /**
   * N most frequent error messages logged by rule(s) to Event Log.
   */
  top_errors?: TopMessages;

  /**
   * N most frequent warning messages logged by rule(s) to Event Log.
   */
  top_warnings?: TopMessages;
}

/**
 * Number of rule executions.
 */
export interface NumberOfExecutions {
  /**
   * Total number of rule executions.
   */
  total: number;

  /**
   * Number of executions by each possible execution outcome.
   */
  by_outcome: Record<RuleLastRunOutcomes, number>;
}

/**
 * Number of events containing some message that were written to the Event Log.
 */
export interface NumberOfLoggedMessages {
  /**
   * Total number of message-containing events.
   */
  total: number;

  /**
   * Number of message-containing events by each log level.
   */
  by_level: Record<LogLevel, number>;
}

/**
 * Stats for detected gaps in rule execution.
 */
export interface NumberOfDetectedGaps {
  /**
   * Total number of detected gaps.
   */
  total: number;

  /**
   * Sum of durations of all the detected gaps, in seconds.
   */
  total_duration_s: number;
}

/**
 * When a rule runs, we calculate a bunch of rule execution metrics for a given rule run.
 * Later, we can aggregate each metric in different ways:
 * - for a single rule, aggregate over a time interval
 * - for multiple rules, aggregate over a time interval
 * - for multiple rules, aggregate over the rules at a given moment (e.g. now)
 *
 * For example, if the metric is "total rule execution duration", we could:
 * - calculate average execution duration of a single rule over last week
 * - calculate average execution duration of all rules in a space over last week
 * - calculate average last execution duration of all rules in a space at the moment
 *
 * Instead of calculating only averages, we calculate a set of percentiles that can give
 * a better picture of the metric's distribution.
 */
export interface AggregatedMetric<T> {
  percentiles: Percentiles<T>;
}

/**
 * Distribution of values of an aggregated metric represented by a set of discreet percentiles.
 * @example
 * {
 *   '50.0': 420,
 *   '95.0': 2500,
 *   '99.0': 7800,
 *   '99.9': 10000,
 * }
 */
export type Percentiles<T> = Record<string, T>;

/**
 * Most frequent messages logged by rule(s) to Event Log.
 */
export type TopMessages = Array<{
  /**
   * Number of occurencies of a message.
   */
  count: number;

  /**
   * The message itself.
   */
  message: string;
}>;
