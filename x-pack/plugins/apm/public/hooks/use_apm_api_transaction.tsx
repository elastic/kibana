/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, Span } from '@elastic/apm-rum';
import { useEffect, useMemo } from 'react';
import { FETCH_STATUS } from './use_fetcher';
import { useApmParams } from './use_apm_params';
import { getParsedDate } from '../context/url_params_context/helpers';

export function useFetcherSpan(endpoint: string, status: FETCH_STATUS) {
  return useMemo(() => ({ endpoint, status }), [endpoint, status]);
}

export function useFetcherTransaction(
  name: string,
  fetchResults: Array<{
    endpoint?: string;
    status: FETCH_STATUS;
  }>
) {
  const { query } = useApmParams('/*');
  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const { transaction, spans } = useMemo(() => {
    return {
      transaction: apm.startTransaction(name, 'apm:fetcher'),
      spans: [] as Array<Span | undefined>,
    };
  }, [name]);

  const didCompleteRequests = fetchResults.every(
    ({ status }) =>
      status === FETCH_STATUS.SUCCESS || status === FETCH_STATUS.FAILURE
  );

  useEffect(() => {
    fetchResults.map(({ status, endpoint }, i) => {
      // start span
      if (status === FETCH_STATUS.LOADING && spans[i] === undefined) {
        spans[i] = transaction?.startSpan(endpoint, 'http');
      }

      // end span
      const span = spans[i];
      if (span !== undefined) {
        if (status === FETCH_STATUS.SUCCESS) {
          span.end();
          // @ts-expect-error
          span.outcome = 'success';
        }

        if (status === FETCH_STATUS.FAILURE) {
          span.end();
          // @ts-expect-error
          span.outcome = 'failure';
        }
      }
    });

    // @ts-expect-error
    const txEnded = transaction?.ended;
    if (transaction && didCompleteRequests && !txEnded) {
      transaction.end();
      const isFailure = fetchResults.some(
        ({ status }) => status === FETCH_STATUS.FAILURE
      );
      // @ts-expect-error
      transaction.outcome = isFailure ? 'failure' : 'success';

      if (rangeFrom && rangeTo) {
        const fromDate = getParsedDate(rangeFrom);
        const toDate = getParsedDate(rangeTo);

        if (fromDate && toDate) {
          transaction.addLabels({
            time_range_duration_minutes:
              toDate.getTime() - fromDate.getTime() / 1000 / 60,
          });
        }
      }
    }
  }, [
    transaction,
    didCompleteRequests,
    fetchResults,
    spans,
    rangeFrom,
    rangeTo,
  ]);
}
