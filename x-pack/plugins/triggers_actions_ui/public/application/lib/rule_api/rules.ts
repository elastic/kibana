/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { Rule, Pagination, Sorting } from '../../../types';
import { AsApiContract } from '../../../../../actions/common';
import { mapFiltersToKql } from './map_filters_to_kql';
import { transformRule } from './common_transformations';

const rewriteResponseRes = (results: Array<AsApiContract<Rule>>): Rule[] => {
  return results.map((item) => transformRule(item));
};

export async function loadRules({
  http,
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleStatusesFilter,
  ruleStatusFilter,
  sort = { field: 'name', direction: 'asc' },
}: {
  http: HttpSetup;
  page: Pagination;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleStatusesFilter?: string[];
  ruleStatusFilter?: boolean[];
  sort?: Sorting;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}> {
  const filters = mapFiltersToKql({
    typesFilter,
    actionTypesFilter,
    ruleStatusesFilter,
    ruleStatusFilter,
  });
  const res = await http.get<
    AsApiContract<{
      page: number;
      perPage: number;
      total: number;
      data: Array<AsApiContract<Rule>>;
    }>
  >(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
      sort_field: sort.field,
      sort_order: sort.direction,
    },
  });
  return {
    page: res.page,
    perPage: res.per_page,
    total: res.total,
    data: rewriteResponseRes(res.data),
  };
}
