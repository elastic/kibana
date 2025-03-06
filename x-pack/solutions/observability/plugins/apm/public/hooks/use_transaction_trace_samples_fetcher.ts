/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

export type TraceSamplesFetchResult = ReturnType<typeof useTransactionTraceSamplesFetcher>;

export function useTransactionTraceSamplesFetcher({
  transactionName,
  kuery,
  environment,
}: {
  transactionName: string;
  kuery: string;
  environment: string;
}) {
  const { serviceName, transactionType } = useApmServiceContext();

  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    urlParams: { transactionId, traceId, sampleRangeFrom, sampleRangeTo },
  } = useLegacyUrlParams();

  const { data, status, error } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType && transactionName) {
        return callApmApi('GET /internal/apm/services/{serviceName}/transactions/traces/samples', {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
              transactionId,
              traceId,
              sampleRangeFrom,
              sampleRangeTo,
            },
          },
        });
      }
    },
    // the samples should not be refetched if the transactionId or traceId changes

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      sampleRangeFrom,
      sampleRangeTo,
    ]
  );

  return useMemo(
    () => ({
      data,
      status,
      error,
    }),
    [data, status, error]
  );
}
