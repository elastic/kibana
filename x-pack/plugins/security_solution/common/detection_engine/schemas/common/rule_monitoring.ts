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
  'succeeded' = 'succeeded',
  'failed' = 'failed',
  'going to run' = 'going to run',
  'partial failure' = 'partial failure',
  /**
   * @deprecated 'partial failure' status should be used instead
   */
  'warning' = 'warning',
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
  [RuleExecutionStatus.warning]: 20,
  [RuleExecutionStatus['partial failure']]: 20,
  [RuleExecutionStatus.failed]: 30,
};

// -------------------------------------------------------------------------------------------------
// Rule execution metrics

export const countMetric = PositiveInteger;
export type CountMetric = t.TypeOf<typeof countMetric>;

export const durationMetric = PositiveInteger;
export type DurationMetric = t.TypeOf<typeof durationMetric>;

export const ruleExecutionMetrics = t.partial({
  total_alerts: countMetric,
  total_hits: countMetric,
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

const metrics = t.type({
  total_alerts: t.number,
  total_hits: t.number,
  total_indexing_duration_ms: t.number,
  total_search_duration_ms: t.number,
});

const execution = t.type({
  metrics,
  status: t.string,
});

const rule = t.type({
  execution,
});

const alert = t.type({
  rule,
});

const event = t.type({
  duration: t.number,
});

const task = t.type({
  schedule_delay: t.number,
});

const kibana = t.type({
  task,
  alert,
});

export const aggregateRuleExecutionEvent = t.type({
  kibana,
  event,
  message: t.string,
  '@timestamp': IsoDateString,
});

export type AggregateRuleExecutionEvent = t.TypeOf<typeof aggregateRuleExecutionEvent>;
