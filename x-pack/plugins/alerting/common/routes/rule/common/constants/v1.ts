/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ruleNotifyWhen = {
  CHANGE: 'onActionGroupChange',
  ACTIVE: 'onActiveAlert',
  THROTTLE: 'onThrottleInterval',
} as const;

export const ruleLastRunOutcomeValues = {
  SUCCEEDED: 'succeeded',
  WARNING: 'warning',
  FAILED: 'failed',
} as const;

export const ruleExecutionStatusValues = {
  OK: 'ok',
  ACTIVE: 'active',
  ERROR: 'error',
  WARNING: 'warning',
  PENDING: 'pending',
  UNKNOWN: 'unknown',
} as const;

export const ruleExecutionStatusErrorReason = {
  READ: 'read',
  DECRYPT: 'decrypt',
  EXECUTE: 'execute',
  UNKNOWN: 'unknown',
  LICENSE: 'license',
  TIMEOUT: 'timeout',
  DISABLED: 'disabled',
  VALIDATE: 'validate',
} as const;

export const ruleExecutionStatusWarningReason = {
  MAX_EXECUTABLE_ACTIONS: 'maxExecutableActions',
  MAX_ALERTS: 'maxAlerts',
  MAX_QUEUED_ACTIONS: 'maxQueuedActions',
} as const;

export type RuleNotifyWhen = (typeof ruleNotifyWhen)[keyof typeof ruleNotifyWhen];
export type RuleLastRunOutcomeValues =
  (typeof ruleLastRunOutcomeValues)[keyof typeof ruleLastRunOutcomeValues];
export type RuleExecutionStatusValues =
  (typeof ruleExecutionStatusValues)[keyof typeof ruleExecutionStatusValues];
export type RuleExecutionStatusErrorReason =
  (typeof ruleExecutionStatusErrorReason)[keyof typeof ruleExecutionStatusErrorReason];
export type RuleExecutionStatusWarningReason =
  (typeof ruleExecutionStatusWarningReason)[keyof typeof ruleExecutionStatusWarningReason];
