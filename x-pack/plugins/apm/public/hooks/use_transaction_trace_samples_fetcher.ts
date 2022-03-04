/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from './use_fetcher';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

export interface TraceSample {
  traceId: string;
  transactionId: string;
}

const INITIAL_DATA = {
  traceSamples: [] as TraceSample[],
};

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
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    urlParams: { transactionId, traceId, sampleRangeFrom, sampleRangeTo },
  } = useLegacyUrlParams();

  const {
    data = INITIAL_DATA,
    status,
    error,
  } = useFetcher(
    async (callApmApi) => {
      if (serviceName && start && end && transactionType && transactionName) {
        const response = await callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
          {
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
          }
        );

        return response;
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

  return {
    traceSamplesData: data,
    traceSamplesStatus: status,
    traceSamplesError: error,
  };
}
