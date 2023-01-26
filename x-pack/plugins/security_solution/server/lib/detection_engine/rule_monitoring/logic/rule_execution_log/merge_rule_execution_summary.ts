/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionStatus as RuleExecutionStatusByFramework } from '@kbn/alerting-plugin/common';

import type { RuleExecutionSummary } from '../../../../../../common/detection_engine/rule_monitoring';
import {
  RuleExecutionStatus,
  ruleExecutionStatusToNumber,
} from '../../../../../../common/detection_engine/rule_monitoring';

export const mergeRuleExecutionSummary = (
  ruleExecutionStatus: RuleExecutionStatusByFramework,
  ruleExecutionSummary: RuleExecutionSummary | null
): RuleExecutionSummary | null => {
  if (ruleExecutionSummary == null) {
    return null;
  }

  const frameworkStatus = ruleExecutionStatus;
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
        status_order: ruleExecutionStatusToNumber(RuleExecutionStatus.failed),
        message: `Reason: ${frameworkStatus.error?.reason} Message: ${frameworkStatus.error?.message}`,
        metrics: customStatus.metrics,
      },
    };
  }

  return ruleExecutionSummary;
};
