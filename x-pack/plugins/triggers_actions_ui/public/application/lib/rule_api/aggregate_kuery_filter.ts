/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregateRulesResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/aggregate';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { LoadRuleAggregationsProps } from './aggregate_helpers';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

interface AggregateRulesResponse {
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

const transformBodyResponse = ({
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

export async function loadRuleAggregationsWithKueryFilter({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
}: LoadRuleAggregationsProps): Promise<AggregateRulesResponse> {
  const filtersKueryNode = mapFiltersToKueryNode({
    typesFilter,
    actionTypesFilter,
    tagsFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    searchText,
  });

  const res = await http.post<AggregateRulesResponseBody>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        ...(filtersKueryNode ? { filter: JSON.stringify(filtersKueryNode) } : {}),
        default_search_operator: 'AND',
      }),
    }
  );

  return transformBodyResponse(res);
}
