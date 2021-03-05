/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useServiceName } from '../../../hooks/use_service_name';

type TransactionsAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups'>;

const DEFAULT_RESPONSE: Partial<TransactionsAPIResponse> = {
  items: undefined,
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function useTransactionListFetcher() {
  const {
    urlParams: { environment, kuery, transactionType, start, end },
  } = useUrlParams();
  const serviceName = useServiceName();
  const { data = DEFAULT_RESPONSE, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/transactions/groups',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, transactionType]
  );

  return {
    transactionListData: data,
    transactionListStatus: status,
    transactionListError: error,
  };
}
