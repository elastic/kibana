/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

export function useTransactionBreakdown({
  kuery,
  environment,
}: {
  kuery: string;
  environment: string;
}) {
  const {
    urlParams: { transactionName },
  } = useLegacyUrlParams();

  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, serviceName, transactionTypeStatus } = useApmServiceContext();

  const {
    data = { timeseries: undefined },
    error,
    status,
  } = useFetcher(
    (callApmApi) => {
      if (!transactionType && transactionTypeStatus === FETCH_STATUS.SUCCESS) {
        return Promise.resolve({ timeseries: undefined });
      }

      if (serviceName && start && end && transactionType) {
        return callApmApi('GET /internal/apm/services/{serviceName}/transaction/charts/breakdown', {
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
      transactionTypeStatus,
      transactionName,
    ]
  );

  return {
    data,
    status,
    error,
  };
}
