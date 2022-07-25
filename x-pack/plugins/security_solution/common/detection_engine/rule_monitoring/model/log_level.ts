/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { enumFromString } from '../../../utils/enum_from_string';
import { assertUnreachable } from '../../../utility_types';
import { RuleExecutionStatus } from './execution_status';

export enum LogLevel {
  'trace' = 'trace',
  'debug' = 'debug',
  'info' = 'info',
  'warn' = 'warn',
  'error' = 'error',
}

export const TLogLevel = enumeration('LogLevel', LogLevel);

/**
 * An array of supported log levels.
 */
export const LOG_LEVELS = Object.values(LogLevel);

export const logLevelToNumber = (level: keyof typeof LogLevel | null | undefined): number => {
  if (!level) {
    return 0;
  }

  switch (level) {
    case 'trace':
      return 0;
    case 'debug':
      return 10;
    case 'info':
      return 20;
    case 'warn':
      return 30;
    case 'error':
      return 40;
    default:
      assertUnreachable(level);
      return 0;
  }
};

export const logLevelFromNumber = (num: number | null | undefined): LogLevel => {
  if (num === null || num === undefined || num < 10) {
    return LogLevel.trace;
  }
  if (num < 20) {
    return LogLevel.debug;
  }
  if (num < 30) {
    return LogLevel.info;
  }
  if (num < 40) {
    return LogLevel.warn;
  }
  return LogLevel.error;
};

export const logLevelFromString = enumFromString(LogLevel);

export const logLevelFromExecutionStatus = (status: RuleExecutionStatus): LogLevel => {
  switch (status) {
    case RuleExecutionStatus['going to run']:
    case RuleExecutionStatus.running:
    case RuleExecutionStatus.succeeded:
      return LogLevel.info;
    case RuleExecutionStatus['partial failure']:
      return LogLevel.warn;
    case RuleExecutionStatus.failed:
      return LogLevel.error;
    default:
      assertUnreachable(status);
      return LogLevel.trace;
  }
};
