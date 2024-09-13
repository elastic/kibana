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

export interface LoadExecutionKPIAggregationsProps {
  id: string;
  outcomeFilter?: string[];
  message?: string;
  dateStart: string;
  dateEnd?: string;
  ruleTypeIds?: string[];
}

export const loadExecutionKPIAggregations = ({
  id,
  http,
  outcomeFilter,
  message,
  dateStart,
  dateEnd,
  ruleTypeIds,
}: LoadExecutionKPIAggregationsProps & { http: HttpSetup }) => {
  const filter = getFilter({ outcomeFilter, message, ruleTypeIds });

  return http.get<IExecutionKPIResult>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/_execution_kpi`,
    {
      query: {
        filter: filter.length ? filter.join(' and ') : undefined,
        date_start: dateStart,
        date_end: dateEnd,
      },
    }
  );
};
