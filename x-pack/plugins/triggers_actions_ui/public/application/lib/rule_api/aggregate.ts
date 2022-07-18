/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { RuleAggregations, RuleStatus } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';

export interface RuleTagsAggregations {
  ruleTags: string[];
}

const rewriteBodyRes: RewriteRequestCase<RuleAggregations> = ({
  rule_execution_status: ruleExecutionStatus,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  rule_snoozed_status: ruleSnoozedStatus,
  rule_tags: ruleTags,
  ...rest
}: any) => ({
  ...rest,
  ruleExecutionStatus,
  ruleEnabledStatus,
  ruleMutedStatus,
  ruleSnoozedStatus,
  ruleTags,
});

const rewriteTagsBodyRes: RewriteRequestCase<RuleTagsAggregations> = ({
  rule_tags: ruleTags,
}: any) => ({
  ruleTags,
});

// TODO: https://github.com/elastic/kibana/issues/131682
export async function loadRuleTags({ http }: { http: HttpSetup }): Promise<RuleTagsAggregations> {
  const res = await http.get<AsApiContract<RuleAggregations>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`
  );
  return rewriteTagsBodyRes(res);
}

export interface LoadRuleAggregationsProps {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
  tagsFilter?: string[];
}

export async function loadRuleAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
}: LoadRuleAggregationsProps): Promise<RuleAggregations> {
  const filters = mapFiltersToKql({
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });
  const res = await http.get<AsApiContract<RuleAggregations>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      query: {
        search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
        search: searchText,
        filter: filters.length ? filters.join(' and ') : undefined,
        default_search_operator: 'AND',
      },
    }
  );
  return rewriteBodyRes(res);
}
