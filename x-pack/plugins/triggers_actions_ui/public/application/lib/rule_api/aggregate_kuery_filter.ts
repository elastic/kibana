/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AsApiContract } from '@kbn/actions-plugin/common';
import { RuleAggregations } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { LoadRuleAggregationsProps, rewriteBodyRes } from './aggregate_helpers';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

export async function loadRuleAggregationsWithKueryFilter({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
}: LoadRuleAggregationsProps): Promise<RuleAggregations> {
  const filtersKueryNode = mapFiltersToKueryNode({
    typesFilter,
    actionTypesFilter,
    tagsFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    searchText,
  });

  const res = await http.post<AsApiContract<RuleAggregations>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
    {
      body: JSON.stringify({
        ...(filtersKueryNode ? { filter: JSON.stringify(filtersKueryNode) } : {}),
        default_search_operator: 'AND',
      }),
    }
  );
  return rewriteBodyRes(res);
}
