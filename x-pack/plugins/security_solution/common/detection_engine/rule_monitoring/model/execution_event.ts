/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration, IsoDateString } from '@kbn/securitysolution-io-ts-types';
import { enumFromString } from '../../../utils/enum_from_string';
import { TLogLevel } from './log_level';

/**
 * Type of a plain rule execution event.
 */
export enum RuleExecutionEventType {
  /**
   * Simple log message of some log level, such as debug, info or error.
   */
  'message' = 'message',

  /**
   * We log an event of this type each time a rule changes its status during an execution.
   */
  'status-change' = 'status-change',

  /**
   * We log an event of this type at the end of a rule execution. It contains various execution
   * metrics such as search and indexing durations.
   */
  'execution-metrics' = 'execution-metrics',
}

export const TRuleExecutionEventType = enumeration(
  'RuleExecutionEventType',
  RuleExecutionEventType
);

/**
 * An array of supported types of rule execution events.
 */
export const RULE_EXECUTION_EVENT_TYPES = Object.values(RuleExecutionEventType);

export const ruleExecutionEventTypeFromString = enumFromString(RuleExecutionEventType);

/**
 * Plain rule execution event. A rule can write many of them during each execution. Events can be
 * of different types and log levels.
 *
 * NOTE: This is a read model of rule execution events and it is pretty generic. It contains only a
 * subset of their fields: only those fields that are common to all types of execution events.
 */
export type RuleExecutionEvent = t.TypeOf<typeof RuleExecutionEvent>;
export const RuleExecutionEvent = t.type({
  timestamp: IsoDateString,
  sequence: t.number,
  level: TLogLevel,
  type: TRuleExecutionEventType,
  message: t.string,
});
