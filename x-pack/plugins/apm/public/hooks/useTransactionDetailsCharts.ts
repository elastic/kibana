/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { loadTransactionDetailsCharts } from '../services/rest/apm/transaction_groups';
import { getTransactionCharts } from '../store/selectors/chartSelectors';
import { IUrlParams } from '../store/urlParams';
import { useFetcher } from './useFetcher';

export function useTransactionDetailsCharts(urlParams: IUrlParams) {
  const {
    serviceName,
    transactionType,
    start,
    end,
    transactionName,
    kuery
  } = urlParams;

  const { data, error, status } = useFetcher(
    () =>
      loadTransactionDetailsCharts({
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        kuery
      }),
    [serviceName, transactionName, transactionType, start, end, kuery]
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
