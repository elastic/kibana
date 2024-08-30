/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAggregationFormattedResult } from '../../../../../../application/rule/methods/aggregate/types';
import { AggregateRulesResponseBodyV1 } from '../../../../../schemas/rule/apis/aggregate';

export const transformAggregateBodyResponse = ({
  ruleExecutionStatus,
  ruleEnabledStatus,
  ruleLastRunOutcome,
  ruleMutedStatus,
  ruleSnoozedStatus,
  ruleTags,
}: RuleAggregationFormattedResult): AggregateRulesResponseBodyV1 => ({
  rule_execution_status: ruleExecutionStatus,
  rule_last_run_outcome: ruleLastRunOutcome,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  rule_snoozed_status: ruleSnoozedStatus,
  rule_tags: ruleTags,
});
