/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, omit, isEmpty } from 'lodash';
import { useHistory, useParams } from 'react-router-dom';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { useUiFilters } from '../context/UrlParamsContext';
import { toQuery, fromQuery } from '../components/shared/Links/url_helpers';
import { maybe } from '../../common/utils/maybe';
import { APIReturnType } from '../services/rest/createCallApmApi';

type APIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transaction_groups/distribution'>;

const INITIAL_DATA = {
  buckets: [] as APIResponse['buckets'],
  noHits: true,
  bucketSize: 0,
};

export function useTransactionDistribution(urlParams: IUrlParams) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const {
    start,
    end,
    transactionType,
    transactionId,
    traceId,
    transactionName,
  } = urlParams;
  const uiFilters = useUiFilters(urlParams);

  const history = useHistory();

  const { data = INITIAL_DATA, status, error } = useFetcher(
    async (callApmApi) => {
      if (serviceName && start && end && transactionType && transactionName) {
        const response = await callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transaction_groups/distribution',
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              transactionId,
              traceId,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });

        const selectedSample =
          transactionId && traceId
            ? flatten(response.buckets.map((bucket) => bucket.samples)).find(
                (sample) =>
                  sample.transactionId === transactionId &&
                  sample.traceId === traceId
              )
            : undefined;

        if (!selectedSample) {
          // selected sample was not found. select a new one:
          // sorted by total number of requests, but only pick
          // from buckets that have samples
          const bucketsSortedByCount = response.buckets
            .filter((bucket) => !isEmpty(bucket.samples))
            .sort((bucket) => bucket.count);

          const preferredSample = maybe(bucketsSortedByCount[0]?.samples[0]);

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

        return response;
      }
    },
    // the histogram should not be refetched if the transactionId or traceId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceName, start, end, transactionType, transactionName, uiFilters]
  );

  return { data, status, error };
}
