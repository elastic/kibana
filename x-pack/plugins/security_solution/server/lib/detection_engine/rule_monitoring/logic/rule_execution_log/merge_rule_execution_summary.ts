/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResolvedSanitizedRule,
  RuleExecutionStatus as RuleExecutionStatusByFramework,
  SanitizedRule,
} from '@kbn/alerting-plugin/common';

import type { RuleExecutionSummary } from '../../../../../../common/detection_engine/rule_monitoring';
import {
  RuleExecutionStatus,
  ruleExecutionStatusToNumber,
} from '../../../../../../common/detection_engine/rule_monitoring';
import type { RuleParams } from '../../../rule_schema';

export const mergeRuleExecutionSummary = (
  ruleExecutionStatus: RuleExecutionStatusByFramework,
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RuleExecutionSummary | null => {
  const frameworkStatus = ruleExecutionStatus;
  const isFrameworkStatusMoreRecent =
    !rule.monitoring ||
    new Date(frameworkStatus.lastExecutionDate) > new Date(rule.monitoring?.run.last_run.timestamp);

  if (frameworkStatus.status === 'error' && isFrameworkStatusMoreRecent) {
    return {
      last_execution: {
        date: frameworkStatus.lastExecutionDate.toISOString(),
        status: RuleExecutionStatus.failed,
        status_order: ruleExecutionStatusToNumber(RuleExecutionStatus.failed),
        message: `Reason: ${frameworkStatus.error?.reason} Message: ${frameworkStatus.error?.message}`,
        metrics: {
          total_indexing_duration_ms:
            rule.monitoring?.run.last_run.metrics.total_indexing_duration_ms ?? undefined,
          total_search_duration_ms:
            rule.monitoring?.run.last_run.metrics.total_search_duration_ms ?? undefined,
          execution_gap_duration_s:
            rule.monitoring?.run.last_run.metrics.gap_duration_s ?? undefined,
          total_enrichment_duration_ms:
            rule.monitoring?.run.last_run.metrics.total_enrichment_duration_ms ?? undefined,
        },
      },
    };
  }

  return ruleExecutionSummary;
};
