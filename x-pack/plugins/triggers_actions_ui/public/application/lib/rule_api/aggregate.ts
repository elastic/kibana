/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RuleAggregationFormattedResult,
  getDefaultRuleAggregation,
  getRuleTagsAggregation,
  formatDefaultAggregationResult,
  formatRuleTagsAggregationResult,
  DefaultRuleAggregationResult,
  RuleTagsAggregationResult,
  RuleTagsAggregationFormattedResult,
} from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { LoadRuleAggregationsProps, LoadRuleTagsProps } from './aggregate_helpers';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

export async function loadRuleTags({
  http,
  searchText,
  after,
  filter,
}: LoadRuleTagsProps): Promise<RuleTagsAggregationFormattedResult> {
  const filtersKueryNode = mapFiltersToKueryNode({
    tagsFilter: filter,
  });

  const res = await http.post<RuleTagsAggregationResult>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        aggs: JSON.stringify(getRuleTagsAggregation({ after })),
        search_fields: searchText ? JSON.stringify(['tags']) : undefined,
        search: searchText,
        ...(filtersKueryNode ? { filter: JSON.stringify(filtersKueryNode) } : {}),
      }),
    }
  );
  return formatRuleTagsAggregationResult(res);
}

export async function loadRuleAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
}: LoadRuleAggregationsProps): Promise<RuleAggregationFormattedResult> {
  const filtersKueryNode = mapFiltersToKueryNode({
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });
  const res = await http.post<DefaultRuleAggregationResult>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        aggs: JSON.stringify(getDefaultRuleAggregation()),
        search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
        search: searchText,
        default_search_operator: 'AND',
        ...(filtersKueryNode ? { filter: JSON.stringify(filtersKueryNode) } : {}),
      }),
    }
  );
  return formatDefaultAggregationResult(res);
}
