/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { IExecutionKPIResult } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface LoadGlobalExecutionKPIAggregationsProps {
  id: string;
  outcomeFilter?: string[];
  message?: string;
  dateStart: string;
  dateEnd?: string;
}

const getFilter = ({ outcomeFilter, message }: { outcomeFilter?: string[]; message?: string }) => {
  const filter: string[] = [];

  if (outcomeFilter && outcomeFilter.length) {
    filter.push(`event.outcome: ${outcomeFilter.join(' or ')}`);
  }

  if (message) {
    const escapedMessage = message.replace(/([\)\(\<\>\}\{\"\:\\])/gm, '\\$&');
    filter.push(`message: "${escapedMessage}" OR error.message: "${escapedMessage}"`);
  }

  return filter;
};

export const loadGlobalExecutionKPIAggregations = ({
  id,
  http,
  outcomeFilter,
  message,
  dateStart,
  dateEnd,
}: LoadGlobalExecutionKPIAggregationsProps & { http: HttpSetup }) => {
  const filter = getFilter({ outcomeFilter, message });

  return http.get<IExecutionKPIResult>(`${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_kpi`, {
    query: {
      filter: filter.length ? filter.join(' and ') : undefined,
      date_start: dateStart,
      date_end: dateEnd,
    },
  });
};
