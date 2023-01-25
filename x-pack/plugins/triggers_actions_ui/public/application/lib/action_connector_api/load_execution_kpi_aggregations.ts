/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { IExecutionKPIResult } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';
import { getFilter } from '../rule_api';

export interface LoadGlobalConnectorExecutionKPIAggregationsProps {
  outcomeFilter?: string[];
  message?: string;
  dateStart: string;
  dateEnd?: string;
  namespaces?: Array<string | undefined>;
}

export const loadGlobalConnectorExecutionKPIAggregations = ({
  http,
  outcomeFilter,
  message,
  dateStart,
  dateEnd,
  namespaces,
}: LoadGlobalConnectorExecutionKPIAggregationsProps & { http: HttpSetup }) => {
  const filter = getFilter({ outcomeFilter, message });

  return http.post<IExecutionKPIResult>(
    `${INTERNAL_BASE_ACTION_API_PATH}/_global_connector_execution_kpi`,
    {
      body: JSON.stringify({
        filter: filter.length ? filter.join(' and ') : undefined,
        date_start: dateStart,
        date_end: dateEnd,
        namespaces: namespaces ? JSON.stringify(namespaces) : namespaces,
      }),
    }
  );
};
