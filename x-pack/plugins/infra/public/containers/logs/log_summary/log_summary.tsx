/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { exhaustMap, map, Observable } from 'rxjs';
import { HttpHandler } from '@kbn/core-http-browser';
import { useObservableState, useReplaySubject } from '../../../utils/use_observable';
import { fetchLogSummary } from './api/fetch_log_summary';
import { LogEntriesSummaryRequest, LogEntriesSummaryResponse } from '../../../../common/http_api';
import { useBucketSize } from './bucket_size';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export type LogSummaryBuckets = LogEntriesSummaryResponse['data']['buckets'];

export const useLogSummary = (
  sourceId: string,
  startTimestamp: number | null,
  endTimestamp: number | null,
  filterQuery: string | null
) => {
  const { services } = useKibanaContextForPlugin();
  const bucketSize = useBucketSize(startTimestamp, endTimestamp);

  const [logSummaryBuckets$, pushLogSummaryBucketsArgs] = useReplaySubject(fetchLogSummary$);
  const { latestValue: logSummaryBuckets } = useObservableState(logSummaryBuckets$, NO_BUCKETS);

  useEffect(() => {
    if (startTimestamp === null || endTimestamp === null || bucketSize === null) {
      return;
    }

    pushLogSummaryBucketsArgs([
      {
        sourceId,
        startTimestamp,
        endTimestamp,
        bucketSize,
        query: filterQuery,
      },
      services.http.fetch,
    ]);
  }, [
    bucketSize,
    endTimestamp,
    filterQuery,
    pushLogSummaryBucketsArgs,
    services.http.fetch,
    sourceId,
    startTimestamp,
  ]);

  return {
    buckets: logSummaryBuckets,
    start: startTimestamp,
    end: endTimestamp,
  };
};

const NO_BUCKETS: LogSummaryBuckets = [];

type FetchLogSummaryArgs = [args: LogEntriesSummaryRequest, fetch: HttpHandler];

const fetchLogSummary$ = (
  fetchArguments$: Observable<FetchLogSummaryArgs>
): Observable<LogSummaryBuckets> =>
  fetchArguments$.pipe(
    exhaustMap(([args, fetch]) => fetchLogSummary(args, fetch)),
    map(({ data: { buckets } }) => buckets)
  );
