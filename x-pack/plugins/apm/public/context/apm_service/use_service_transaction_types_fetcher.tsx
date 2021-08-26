/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useApmParams } from '../../hooks/use_apm_params';
import { useFetcher } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';

const INITIAL_DATA = { transactionTypes: [] };

export function useServiceTransactionTypesFetcher(serviceName?: string) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/:serviceName');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_DATA } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/transaction_types',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  return data.transactionTypes;
}
