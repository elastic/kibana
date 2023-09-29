/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AsApiContract } from '@kbn/actions-plugin/common';
import { AggregateRulesResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/aggregate';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';
import {
  LoadRuleAggregationsProps,
  LoadRuleTagsProps,
  rewriteBodyRes,
  rewriteTagsBodyRes,
  GetRuleTagsResponse,
  AggregateRulesResponse,
} from './aggregate_helpers';

export async function loadRuleTags({
  http,
  search,
  perPage,
  page,
}: LoadRuleTagsProps): Promise<GetRuleTagsResponse> {
  const res = await http.get<AsApiContract<GetRuleTagsResponse>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_tags`,
    {
      query: {
        search,
        per_page: perPage,
        page,
      },
    }
  );
  return rewriteTagsBodyRes(res);
}

export async function loadRuleAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
  filterConsumers,
}: LoadRuleAggregationsProps): Promise<AggregateRulesResponse> {
  const filters = mapFiltersToKql({
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });
  const res = await http.post<AggregateRulesResponseBody>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
        search: searchText,
        filter: filters.length ? filters.join(' and ') : undefined,
        default_search_operator: 'AND',
        filter_consumers: filterConsumers,
      }),
    }
  );
  return rewriteBodyRes(res);
}
