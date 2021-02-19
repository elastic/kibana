/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';

export function useTransactionBreakdown() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { environment, start, end, transactionName } = urlParams;
  const { transactionType } = useApmServiceContext();

  const { data = { timeseries: undefined }, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transaction/charts/breakdown',
          params: {
            path: { serviceName },
            query: {
              environment,
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
    [
      environment,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      uiFilters,
    ]
  );

  return {
    data,
    status,
    error,
  };
}
