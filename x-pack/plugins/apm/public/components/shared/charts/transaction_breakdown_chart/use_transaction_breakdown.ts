/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';

export function useTransactionBreakdown() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end, transactionName } = urlParams;
  const { transactionType } = useApmServiceContext();

  const { data = { timeseries: undefined }, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transaction_groups/breakdown',
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
