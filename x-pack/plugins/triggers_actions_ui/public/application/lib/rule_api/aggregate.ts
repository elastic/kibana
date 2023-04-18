/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract } from '@kbn/actions-plugin/common';
import {
  RuleAggregationFormattedResult,
  RuleTagsAggregationFormattedResult,
} from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';
import { LoadRuleAggregationsProps, rewriteBodyRes, rewriteTagsBodyRes } from './aggregate_helpers';

// TODO: https://github.com/elastic/kibana/issues/131682
export async function loadRuleTags({
  http,
}: {
  http: HttpSetup;
}): Promise<RuleTagsAggregationFormattedResult> {
  const res = await http.get<AsApiContract<RuleTagsAggregationFormattedResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`
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
      body: JSON.stringify({
        search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
        search: searchText,
        filter: filters.length ? filters.join(' and ') : undefined,
        default_search_operator: 'AND',
      }),
    }
  );
  return rewriteBodyRes(res);
}
