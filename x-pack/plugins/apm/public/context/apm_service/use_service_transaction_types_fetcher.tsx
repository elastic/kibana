/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../hooks/use_fetcher';

const INITIAL_DATA = { transactionTypes: [] };

export function useServiceTransactionTypesFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { data = INITIAL_DATA } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transaction_types',
          {
            params: {
              path: { serviceName },
              query: { start, end },
            },
          }
        );
      }
    },
    [serviceName, start, end]
  );

  return data.transactionTypes;
}
