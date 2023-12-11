/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { AggregateRulesResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/aggregate';
import { RuleStatus } from '../../../types';

export interface AggregateRulesResponse {
  ruleExecutionStatus: Record<string, number>;
  ruleLastRunOutcome: Record<string, number>;
  ruleEnabledStatus: {
    enabled: number;
    disabled: number;
  };
  ruleMutedStatus: {
    muted: number;
    unmuted: number;
  };
  ruleSnoozedStatus: {
    snoozed: number;
  };
  ruleTags: string[];
}

export const rewriteBodyRes = ({
  rule_execution_status: ruleExecutionStatus,
  rule_last_run_outcome: ruleLastRunOutcome,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  rule_snoozed_status: ruleSnoozedStatus,
  rule_tags: ruleTags,
}: AggregateRulesResponseBody): AggregateRulesResponse => ({
  ruleExecutionStatus,
  ruleEnabledStatus,
  ruleMutedStatus,
  ruleSnoozedStatus,
  ruleLastRunOutcome,
  ruleTags,
});

export interface GetRuleTagsResponse {
  total: number;
  page: number;
  perPage: number;
  data: string[];
}

export const rewriteTagsBodyRes: RewriteRequestCase<GetRuleTagsResponse> = ({
  per_page: perPage,
  ...rest
}) => ({
  perPage,
  ...rest,
});

export interface LoadRuleAggregationsProps {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleLastRunOutcomesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
  tagsFilter?: string[];
  filterConsumers?: string[];
}

export interface LoadRuleTagsProps {
  http: HttpSetup;
  search?: string;
  perPage?: number;
  page: number;
}
