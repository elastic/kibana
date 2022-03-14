/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration, IsoDateString, PositiveInteger } from '@kbn/securitysolution-io-ts-types';

// -------------------------------------------------------------------------------------------------
// Rule execution status

/**
 * Custom execution status of Security rules that is different from the status
 * used in the Alerting Framework. We merge our custom status with the
 * Framework's status to determine the resulting status of a rule.
 */
export enum RuleExecutionStatus {
  /**
   * @deprecated Replaced by the 'running' status but left for backwards compatibility
   * with rule execution events already written to Event Log in the prior versions of Kibana.
   * Don't use when writing rule status changes.
   */
  'going to run' = 'going to run',

  /**
   * Rule execution started but not reached any intermediate or final status.
   */
  'running' = 'running',

  /**
   * Rule can partially fail for various reasons either in the middle of an execution
   * (in this case we update its status right away) or in the end of it. So currently
   * this status can be both intermediate and final at the same time.
   * A typical reason for a partial failure: not all the indices that the rule searches
   * over actually exist.
   */
  'partial failure' = 'partial failure',

  /**
   * Rule failed to execute due to unhandled exception or a reason defined in the
   * business logic of its executor function.
   */
  'failed' = 'failed',

  /**
   * Rule executed successfully without any issues. Note: this status is just an indication
   * of a rule's "health". The rule might or might not generate any alerts despite of it.
   */
  'succeeded' = 'succeeded',
}

export const ruleExecutionStatus = enumeration('RuleExecutionStatus', RuleExecutionStatus);

export const ruleExecutionStatusOrder = PositiveInteger;
export type RuleExecutionStatusOrder = t.TypeOf<typeof ruleExecutionStatusOrder>;

export const ruleExecutionStatusOrderByStatus: Record<
  RuleExecutionStatus,
  RuleExecutionStatusOrder
> = {
  [RuleExecutionStatus.succeeded]: 0,
  [RuleExecutionStatus['going to run']]: 10,
  [RuleExecutionStatus.running]: 15,
  [RuleExecutionStatus['partial failure']]: 20,
  [RuleExecutionStatus.failed]: 30,
};

// -------------------------------------------------------------------------------------------------
// Rule execution metrics

export const durationMetric = PositiveInteger;
export type DurationMetric = t.TypeOf<typeof durationMetric>;

export const ruleExecutionMetrics = t.partial({
  total_search_duration_ms: durationMetric,
  total_indexing_duration_ms: durationMetric,
  execution_gap_duration_s: durationMetric,
});

export type RuleExecutionMetrics = t.TypeOf<typeof ruleExecutionMetrics>;

// -------------------------------------------------------------------------------------------------
// Rule execution summary

export const ruleExecutionSummary = t.type({
  last_execution: t.type({
    date: IsoDateString,
    status: ruleExecutionStatus,
    status_order: ruleExecutionStatusOrder,
    message: t.string,
    metrics: ruleExecutionMetrics,
  }),
});

export type RuleExecutionSummary = t.TypeOf<typeof ruleExecutionSummary>;

// -------------------------------------------------------------------------------------------------
// Rule execution events

export const ruleExecutionEvent = t.type({
  date: IsoDateString,
  status: ruleExecutionStatus,
  message: t.string,
});

export type RuleExecutionEvent = t.TypeOf<typeof ruleExecutionEvent>;

// -------------------------------------------------------------------------------------------------
// Aggregate Rule execution events

export const aggregateRuleExecutionEvent = t.type({
  execution_uuid: t.string,
  timestamp: IsoDateString,
  duration_ms: t.number,
  status: t.string,
  message: t.string,
  num_active_alerts: t.number,
  num_new_alerts: t.number,
  num_recovered_alerts: t.number,
  num_triggered_actions: t.number,
  num_succeeded_actions: t.number,
  num_errored_actions: t.number,
  total_search_duration_ms: t.number,
  es_search_duration_ms: t.number,
  schedule_delay_ms: t.number,
  timed_out: t.boolean,
  indexing_duration_ms: t.number,
  search_duration_ms: t.number,
  gap_duration_ms: t.number,
  security_status: t.string,
  security_message: t.string,
});

export type AggregateRuleExecutionEvent = t.TypeOf<typeof aggregateRuleExecutionEvent>;
