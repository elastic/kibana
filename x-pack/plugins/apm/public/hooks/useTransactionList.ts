/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';
import { APIReturnType } from '../services/rest/createCallApmApi';

type TransactionsAPIResponse = APIReturnType<
  '/api/apm/services/{serviceName}/transaction_groups'
>;

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

  return {
    data,
    status,
    error,
  };
}
