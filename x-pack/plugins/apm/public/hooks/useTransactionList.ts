/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { TransactionListAPIResponse } from '../../server/lib/transactions/get_top_transactions';
import { loadTransactionList } from '../services/rest/apm/transaction_groups';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';

const getRelativeImpact = (
  impact: number,
  impactMin: number,
  impactMax: number
) =>
  Math.max(
    ((impact - impactMin) / Math.max(impactMax - impactMin, 1)) * 100,
    1
  );

function getWithRelativeImpact(items: TransactionListAPIResponse) {
  const impacts = items.map(({ impact }) => impact);
  const impactMin = Math.min(...impacts);
  const impactMax = Math.max(...impacts);

  return items.map(item => {
    return {
      ...item,
      impactRelative: getRelativeImpact(item.impact, impactMin, impactMax)
    };
  });
}

export function useTransactionList(urlParams: IUrlParams) {
  const { serviceName, transactionType, start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = [], error, status } = useFetcher(
    () => {
      if (serviceName && start && end && transactionType) {
        return loadTransactionList({
          serviceName,
          start,
          end,
          transactionType,
          uiFilters
        });
      }
    },
    [serviceName, start, end, transactionType, uiFilters]
  );

  const memoizedData = useMemo(() => getWithRelativeImpact(data), [data]);
  return {
    data: memoizedData,
    status,
    error
  };
}
