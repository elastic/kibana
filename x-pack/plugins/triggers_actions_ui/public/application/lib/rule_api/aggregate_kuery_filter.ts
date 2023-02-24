/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RuleAggregationFormattedResult,
  getDefaultRuleAggregation,
  formatDefaultAggregationResult,
  DefaultRuleAggregationResult,
} from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { LoadRuleAggregationsProps } from './aggregate_helpers';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

export async function loadRuleAggregationsWithKueryFilter({
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
    tagsFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    searchText,
  });

  const res = await http.post<DefaultRuleAggregationResult>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        aggs: JSON.stringify(getDefaultRuleAggregation()),
        default_search_operator: 'AND',
        ...(filtersKueryNode ? { filter: JSON.stringify(filtersKueryNode) } : {}),
      }),
    }
  );
  return formatDefaultAggregationResult(res);
}
