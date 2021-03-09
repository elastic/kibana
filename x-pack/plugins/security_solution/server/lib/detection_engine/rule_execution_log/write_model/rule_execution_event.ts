/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionEventLevel } from '../common_model';

// -----------------------------------------------------------------------------
// Types of rule execution events in the write model

export const RuleExecutionEventType = {
  GENERIC: 'generic',
  STATUS_CHANGED: 'status-changed',
} as const;

export type RuleExecutionEventType = typeof RuleExecutionEventType[keyof typeof RuleExecutionEventType];

// -----------------------------------------------------------------------------
// Base interfaces of rule execution events

export interface RuleExecutionEvent<TType extends RuleExecutionEventType, TPayload = null> {
  ruleId: string; // alert id in the Alerting framework terminology
  spaceId: string;
  eventDate: Date;
  eventLevel: RuleExecutionEventLevel;
  eventMessage: string;
  eventType: TType;
  eventPayload: TPayload;
}

export type AnyRuleExecutionEvent = RuleExecutionEvent<RuleExecutionEventType, unknown>;

export type GenericRuleExecutionEvent<TPayload = null> = RuleExecutionEvent<'generic', TPayload>;
