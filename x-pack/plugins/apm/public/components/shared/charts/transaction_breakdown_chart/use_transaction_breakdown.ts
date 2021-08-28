/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';

export function useTransactionBreakdown({
  kuery,
  environment,
}: {
  kuery: string;
  environment: string;
}) {
  const {
    urlParams: { start, end, transactionName },
  } = useUrlParams();
  const { transactionType, serviceName } = useApmServiceContext();

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
              kuery,
              start,
              end,
              transactionName,
              transactionType,
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
    ]
  );

  return {
    data,
    status,
    error,
  };
}
