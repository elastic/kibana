/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

export function useTransactionCharts() {
  const {
    urlParams: { serviceName, transactionType, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/transaction_groups/charts',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, transactionName, transactionType, uiFilters]
  );

  const memoizedData = useMemo(
    () => getTransactionCharts({ transactionType }, data),
    [data, transactionType]
  );

  return {
    data: memoizedData,
    status,
    error
  };
}
