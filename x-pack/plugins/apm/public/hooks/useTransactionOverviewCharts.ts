/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { loadTransactionOverviewCharts } from '../services/rest/apm/transaction_groups';
import { getTransactionCharts } from '../store/selectors/chartSelectors';
import { IUrlParams } from '../store/urlParams';
import { useFetcher } from './useFetcher';

export function useTransactionOverviewCharts(urlParams: IUrlParams) {
  const {
    serviceName,
    transactionType,
    start,
    end,

    kuery
  } = urlParams;

  const { data, error, status } = useFetcher(
    () =>
      loadTransactionOverviewCharts({
        serviceName,
        start,
        end,
        transactionType,
        kuery
      }),
    [serviceName, start, end, transactionType, kuery]
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
