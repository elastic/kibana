/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

/**
 * Rule execution result is an aggregate that groups plain rule execution events by execution UUID.
 * It contains such information as execution UUID, date, status and metrics.
 */
export type RuleExecutionResult = t.TypeOf<typeof RuleExecutionResult>;
export const RuleExecutionResult = t.type({
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
  gap_duration_s: t.number,
  security_status: t.string,
  security_message: t.string,
});

/**
 * We support sorting rule execution results by these fields.
 */
export type SortFieldOfRuleExecutionResult = t.TypeOf<typeof SortFieldOfRuleExecutionResult>;
export const SortFieldOfRuleExecutionResult = t.keyof({
  timestamp: IsoDateString,
  duration_ms: t.number,
  gap_duration_s: t.number,
  indexing_duration_ms: t.number,
  search_duration_ms: t.number,
  schedule_delay_ms: t.number,
});
