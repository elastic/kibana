/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { useTransactionType } from './use_transaction_type';

export function useTransactionBreakdown() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end, transactionName } = urlParams;
  const transactionType = useTransactionType();

  const { data = { timeseries: undefined }, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          pathname:
            '/api/apm/services/{serviceName}/transaction_groups/breakdown',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionName,
              transactionType,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, start, end, transactionType, transactionName, uiFilters]
  );

  return {
    data,
    status,
    error,
  };
}
