/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatus,
  ruleExecutionStatusOrderByStatus,
  RuleExecutionSummary,
} from '../../../../common/detection_engine/schemas/common';
import { RuleAlertType } from '../rules/types';

export const mergeRuleExecutionSummary = (
  rule: RuleAlertType,
  ruleExecutionSummary: RuleExecutionSummary | null
): RuleExecutionSummary | null => {
  if (ruleExecutionSummary == null) {
    return null;
  }

  const frameworkStatus = rule.executionStatus;
  const customStatus = ruleExecutionSummary.last_execution;

  if (
    frameworkStatus.status === 'error' &&
    new Date(frameworkStatus.lastExecutionDate) > new Date(customStatus.date)
  ) {
    return {
      ...ruleExecutionSummary,
      last_execution: {
        date: frameworkStatus.lastExecutionDate.toISOString(),
        status: RuleExecutionStatus.failed,
        status_order: ruleExecutionStatusOrderByStatus[RuleExecutionStatus.failed],
        message: `Reason: ${frameworkStatus.error?.reason} Message: ${frameworkStatus.error?.message}`,
        metrics: customStatus.metrics,
      },
    };
  }

  return ruleExecutionSummary;
};
