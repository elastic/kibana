/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

export function useAvgDurationByCountry() {
  const {
    urlParams: { serviceName, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const { data = [], error, status } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname:
            '/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_country',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              transactionName
            }
          }
        });
      }
    },
    [serviceName, start, end, uiFilters, transactionName]
  );

  return {
    data,
    status,
    error
  };
}
