/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { Alert, Pagination, Sorting } from '../../../types';
import { AsApiContract } from '../../../../../actions/common';
import { mapFiltersToKql } from './map_filters_to_kql';
import { transformAlert } from './common_transformations';

const rewriteResponseRes = (results: Array<AsApiContract<Alert>>): Alert[] => {
  return results.map((item) => transformAlert(item));
};

export async function loadAlerts({
  http,
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
  sort = { field: 'name', direction: 'asc' },
}: {
  http: HttpSetup;
  page: Pagination;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
  sort?: Sorting;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, alertStatusesFilter });
  const res = await http.get(`${BASE_ALERTING_API_PATH}/rules/_find`, {
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
