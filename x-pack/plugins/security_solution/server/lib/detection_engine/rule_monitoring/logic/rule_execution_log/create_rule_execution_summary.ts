/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';

import type { RuleExecutionSummary } from '../../../../../../common/detection_engine/rule_monitoring';
import {
  ruleLastRunOutcomeToExecutionStatus,
  ruleExecutionStatusToNumber,
  RuleExecutionStatus,
} from '../../../../../../common/detection_engine/rule_monitoring';
import type { RuleParams } from '../../../rule_schema';

export const createRuleExecutionSummary = (
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RuleExecutionSummary | null => {
  if (rule.running) {
    return {
      last_execution: {
        date: new Date().toISOString(),
        message: '',
        metrics: {},
        status: RuleExecutionStatus.running,
        status_order: ruleExecutionStatusToNumber(RuleExecutionStatus.running),
      },
    };
  }

  if (!rule.lastRun) {
    return null;
  }

  const ruleExecutionStatus = ruleLastRunOutcomeToExecutionStatus(rule.lastRun.outcome);

  return {
    last_execution: {
      date: rule.monitoring?.run.last_run?.timestamp ?? new Date().toISOString(),
      status: ruleExecutionStatus,
      status_order: ruleExecutionStatusToNumber(ruleExecutionStatus),
      message: rule.lastRun?.outcomeMsg?.join(' \n') ?? '',
      metrics: {
        total_indexing_duration_ms:
          rule.monitoring?.run.last_run.metrics.total_indexing_duration_ms ?? undefined,
        total_search_duration_ms:
          rule.monitoring?.run.last_run.metrics.total_search_duration_ms ?? undefined,
        execution_gap_duration_s: rule.monitoring?.run.last_run.metrics.gap_duration_s ?? undefined,
      },
    },
  };
};
