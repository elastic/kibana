/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { RuleAggregations } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';

const rewriteBodyRes: RewriteRequestCase<RuleAggregations> = ({
  rule_execution_status: ruleExecutionStatus,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  ...rest
}: any) => ({
  ...rest,
  ruleExecutionStatus,
  ruleEnabledStatus,
  ruleMutedStatus,
});

export async function loadRuleAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleStatusesFilter,
}: {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleStatusesFilter?: string[];
}): Promise<RuleAggregations> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, ruleStatusesFilter });
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
