/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { IExecutionKPIResult } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { getFilter } from './get_filter';

export interface LoadGlobalExecutionKPIAggregationsProps {
  id: string;
  outcomeFilter?: string[];
  message?: string;
  dateStart: string;
  dateEnd?: string;
  namespaces?: Array<string | undefined>;
}

export const loadGlobalExecutionKPIAggregations = ({
  id,
  http,
  outcomeFilter,
  message,
  dateStart,
  dateEnd,
  namespaces,
}: LoadGlobalExecutionKPIAggregationsProps & { http: HttpSetup }) => {
  const filter = getFilter({ outcomeFilter, message });

  return http.get<IExecutionKPIResult>(`${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_kpi`, {
    query: {
      filter: filter.length ? filter.join(' and ') : undefined,
      date_start: dateStart,
      date_end: dateEnd,
      namespaces: namespaces ? JSON.stringify(namespaces) : namespaces,
    },
  });
};
