/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { useFetcher } from './use_fetcher';
import { toQuery, fromQuery } from '../components/shared/Links/url_helpers';
import { maybe } from '../../common/utils/maybe';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';

export interface TraceSample {
  traceId: string;
  transactionId: string;
}

const INITIAL_DATA = {
  noHits: true,
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
    urlParams: {
      start,
      end,
      transactionId,
      traceId,
      sampleRangeFrom,
      sampleRangeTo,
    },
  } = useUrlParams();

  const history = useHistory();
  const { data = INITIAL_DATA, status, error } = useFetcher(
    async (callApmApi) => {
      if (serviceName && start && end && transactionType && transactionName) {
        const response = await callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/traces/samples',
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

        if (response.noHits) {
          return response;
        }

        const { traceSamples } = response;

        const selectedSample = traceSamples.find(
          (sample) =>
            sample.transactionId === transactionId && sample.traceId === traceId
        );

        if (!selectedSample) {
          // selected sample was not found. select a new one:
          const preferredSample = maybe(traceSamples[0]);

          history.replace({
            ...history.location,
            search: fromQuery({
              ...omit(toQuery(history.location.search), [
                'traceId',
                'transactionId',
              ]),
              ...preferredSample,
            }),
          });
        }

        return {
          noHits: false,
          traceSamples,
        };
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
