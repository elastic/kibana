/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { AlertAggregations } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { mapFiltersToKql } from './map_filters_to_kql';
import { RewriteRequestCase } from '../../../../../actions/common';

const rewriteBodyRes: RewriteRequestCase<AlertAggregations> = ({
  rule_execution_status: alertExecutionStatus,
  ...rest
}: any) => ({
  ...rest,
  alertExecutionStatus,
});

export async function loadAlertAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
}: {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
}): Promise<AlertAggregations> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, alertStatusesFilter });
  const res = await http.get(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`, {
    query: {
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
    },
  });
  return rewriteBodyRes(res);
}
