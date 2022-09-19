/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface LoadExecutionKPIAggregationsProps {
  id: string;
  dateStart: string;
  dateEnd?: string;
}

export const loadExecutionKPIAggregations = ({
  id,
  http,
  dateStart,
  dateEnd,
}: LoadExecutionKPIAggregationsProps & { http: HttpSetup }) => {
  return http.get<any>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/_execution_kpi`, {
    query: {
      date_start: dateStart,
      date_end: dateEnd,
    },
  });
};
