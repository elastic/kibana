/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

enum RuleLastRunOutcomes {
  SUCCEEDED = 'succeeded',
  WARNING = 'warning',
  FAILED = 'failed',
}

enum RuleExecutionStatusValues {
  OK = 'ok',
  ACTIVE = 'active',
  ERROR = 'error',
  WARNING = 'warning',
  PENDING = 'pending',
  UNKNOWN = 'unknown',
}

enum RuleExecutionStatusErrorReason {
  READ = 'read',
  DECRYPT = 'decrypt',
  EXECUTE = 'execute',
  UNKNOWN = 'unknown',
  LICENSE = 'license',
  TIMEOUT = 'timeout',
  DISABLED = 'disabled',
  VALIDATE = 'validate',
}

enum RuleExecutionStatusWarningReason {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
  MAX_ALERTS = 'maxAlerts',
}

export interface RuleExecutionStatusAttributes {
  status: RuleExecutionStatusValues;
  lastExecutionDate: string;
  lastDuration?: number;
  error?: {
    reason: RuleExecutionStatusErrorReason;
    message: string;
  } | null;
  warning?: {
    reason: RuleExecutionStatusWarningReason;
    message: string;
  } | null;
}

export interface RuleLastRunAttributes {
  outcome: RuleLastRunOutcomes;
  outcomeOrder?: number;
  warning?: RuleExecutionStatusErrorReason | RuleExecutionStatusWarningReason | null;
  outcomeMsg?: string[] | null;
  alertsCount: {
    active?: number | null;
    new?: number | null;
    recovered?: number | null;
    ignored?: number | null;
  };
}
