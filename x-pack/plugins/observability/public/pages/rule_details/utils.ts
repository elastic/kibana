/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleExecutionStatusValues } from '@kbn/alerting-plugin/common';
import { formatDurationFromTimeUnitChar, TimeUnitChar } from '../../../common';

export const getColorStatusBased = (ruleStatus: string) => {
  switch (ruleStatus) {
    case RuleExecutionStatusValues[0]:
      return 'primary';
    case RuleExecutionStatusValues[1]:
      return 'success';
    case RuleExecutionStatusValues[2]:
      return 'danger';
    case RuleExecutionStatusValues[3]:
      return 'warning';
    case RuleExecutionStatusValues[4]:
      return 'subdued';
    default:
      return 'subdued';
  }
};

export const formatInterval = (ruleInterval: string) => {
  const interval: string[] | null = ruleInterval.match(/(^\d*)([s|m|h|d])/);
  if (!interval || interval.length < 3) return ruleInterval;
  const value: number = +interval[1];
  const unit = interval[2] as TimeUnitChar;
  return formatDurationFromTimeUnitChar(value, unit);
};
