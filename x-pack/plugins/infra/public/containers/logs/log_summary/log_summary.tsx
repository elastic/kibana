/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { useCancellableEffect } from '../../../utils/cancellable_effect';
import { fetchLogSummary } from './api/fetch_log_summary';
import { LogEntriesSummaryResponse } from '../../../../common/http_api';
import { useBucketSize } from './bucket_size';

export type LogSummaryBuckets = LogEntriesSummaryResponse['data']['buckets'];

export const useLogSummary = (
  sourceId: string,
  startDate: string | null,
  endDate: string | null,
  startTimestamp: number | null,
  endTimestamp: number | null,
  filterQuery: string | null
) => {
  const [logSummaryBuckets, setLogSummaryBuckets] = useState<LogSummaryBuckets>([]);

  const bucketSize = useBucketSize(startTimestamp, endTimestamp);
  useCancellableEffect(
    getIsCancelled => {
      if (startTimestamp === null || endTimestamp === null || bucketSize === null) {
        return;
      }

      fetchLogSummary({
        sourceId,
        startTimestamp,
        endTimestamp,
        bucketSize,
        query: filterQuery,
      }).then(response => {
        if (!getIsCancelled()) {
          setLogSummaryBuckets(response.data.buckets);
        }
      });
    },
    // Use `*Timestamp` values in the fetch.
    // Use `*Date` to decide if it should refetch or not. `endTimestamp` updates
    // frequently when `endDate` is `"now"` and triggers a lot of re-renders.
    [sourceId, filterQuery, startDate, endDate]
  );

  return {
    buckets: logSummaryBuckets,
    start: startTimestamp,
    end: endTimestamp,
  };
};
