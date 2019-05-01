/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { loadTransactionDetailsCharts } from '../services/rest/apm/transaction_groups';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { useUiFilters } from './useUiFilters';

export function useTransactionDetailsCharts(urlParams: IUrlParams) {
  const {
    serviceName,
    transactionType,
    start,
    end,
    transactionName
  } = urlParams;
  const { uiFilters, uiFiltersKey } = useUiFilters();

  const { data, error, status } = useFetcher(
    () => {
      if (serviceName && start && end && transactionName && transactionType) {
        return loadTransactionDetailsCharts({
          serviceName,
          start,
          end,
          transactionName,
          transactionType,
          uiFilters
        });
      }
    },
    [serviceName, start, end, transactionName, transactionType, uiFiltersKey]
  );

  const memoizedData = useMemo(() => getTransactionCharts(urlParams, data), [
    data
  ]);

  return {
    data: memoizedData,
    status,
    error
  };
}
