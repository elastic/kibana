/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { useUiFilters } from '../context/UrlParamsContext';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { APIReturnType } from '../services/rest/createCallApmApi';
import { useFetcher } from './useFetcher';

type TransactionsAPIResponse = APIReturnType<
  'GET /api/apm/services/{serviceName}/transaction_groups'
>;

const DEFAULT_RESPONSE: Partial<TransactionsAPIResponse> = {
  items: undefined,
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function useTransactionList(urlParams: IUrlParams) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { transactionType, start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = DEFAULT_RESPONSE, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups',
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
