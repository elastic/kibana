/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../hooks/use_fetcher';
import { useServiceName } from '../../hooks/use_service_name';
import { useUrlParams } from '../url_params_context/use_url_params';

const INITIAL_DATA = { transactionTypes: [] };

export function useServiceTransactionTypesFetcher() {
  const serviceName = useServiceName();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;
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
