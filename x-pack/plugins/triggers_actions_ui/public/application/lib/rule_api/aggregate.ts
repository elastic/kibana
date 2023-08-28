/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AsApiContract } from '@kbn/actions-plugin/common';
import { RuleAggregationFormattedResult } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';
import {
  LoadRuleAggregationsProps,
  LoadRuleTagsProps,
  rewriteBodyRes,
  rewriteTagsBodyRes,
  GetRuleTagsResponse,
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
}: LoadRuleAggregationsProps): Promise<RuleAggregationFormattedResult> {
  const filters = mapFiltersToKql({
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });
  const res = await http.post<AsApiContract<RuleAggregationFormattedResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      // TODO: validate body schema
      body: JSON.stringify({
        search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
        search: searchText,
        filter: filters.length ? filters.join(' and ') : undefined,
        default_search_operator: 'AND',
      }),
    }
  );
  // TODO: import from alerting/common
  return rewriteBodyRes(res);
}
