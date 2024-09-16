/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregateRulesResponseBody } from '@kbn/alerting-plugin/server/routes/schemas/rule/apis/aggregate';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import {
  AggregateRulesResponse,
  LoadRuleAggregationsProps,
  rewriteBodyRes,
} from './aggregate_helpers';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

export async function loadRuleAggregationsWithKueryFilter({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
  filterConsumers,
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
        filter_consumers: filterConsumers,
        default_search_operator: 'AND',
      }),
    }
  );

  return rewriteBodyRes(res);
}
