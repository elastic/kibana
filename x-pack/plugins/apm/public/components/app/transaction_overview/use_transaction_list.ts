/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

type TransactionsAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups'>;

const DEFAULT_RESPONSE: Partial<TransactionsAPIResponse> = {
  items: undefined,
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function useTransactionListFetcher() {
  const { urlParams, uiFilters } = useUrlParams();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { transactionType, start, end } = urlParams;
  const { data = DEFAULT_RESPONSE, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/transactions/groups',
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
    transactionListData: data,
    transactionListStatus: status,
    transactionListError: error,
  };
}
