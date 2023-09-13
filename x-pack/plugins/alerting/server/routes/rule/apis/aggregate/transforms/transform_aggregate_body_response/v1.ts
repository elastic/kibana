/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteResponseCase } from '@kbn/actions-plugin/common';
import { AggregateRulesResponseBody } from '../../../../../../application/rule/methods/aggregate/types';

export const transformAggregateBodyResponse: RewriteResponseCase<AggregateRulesResponseBody> = ({
  ruleExecutionStatus,
  ruleLastRunOutcome,
  ruleEnabledStatus,
  ruleMutedStatus,
  ruleSnoozedStatus,
  ruleTags,
}) => ({
  rule_execution_status: ruleExecutionStatus,
  rule_last_run_outcome: ruleLastRunOutcome,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  rule_snoozed_status: ruleSnoozedStatus,
  rule_tags: ruleTags,
});
