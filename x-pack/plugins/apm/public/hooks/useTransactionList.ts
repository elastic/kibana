/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';
import { APIReturnType } from '../services/rest/createCallApmApi';

const getRelativeImpact = (
  impact: number,
  impactMin: number,
  impactMax: number
) =>
  Math.max(
    ((impact - impactMin) / Math.max(impactMax - impactMin, 1)) * 100,
    1
  );

type TransactionsAPIResponse = APIReturnType<
  '/api/apm/services/{serviceName}/transaction_groups'
>;

function getWithRelativeImpact(items: TransactionsAPIResponse['items']) {
  const impacts = items
    .map(({ impact }) => impact)
    .filter((impact) => impact !== null) as number[];

  const impactMin = Math.min(...impacts);
  const impactMax = Math.max(...impacts);

  return items.map((item) => {
    return {
      ...item,
      impactRelative:
        item.impact !== null
          ? getRelativeImpact(item.impact, impactMin, impactMax)
          : null,
    };
  });
}

const DEFAULT_RESPONSE: TransactionsAPIResponse = {
  items: [],
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function useTransactionList(urlParams: IUrlParams) {
  const { serviceName, transactionType, start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = DEFAULT_RESPONSE, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/transaction_groups',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionType,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, start, end, transactionType, uiFilters]
  );

  const memoizedData = useMemo(
    () => ({
      items: getWithRelativeImpact(data.items),
      isAggregationAccurate: data.isAggregationAccurate,
      bucketSize: data.bucketSize,
    }),
    [data]
  );
  return {
    data: memoizedData,
    status,
    error,
  };
}
