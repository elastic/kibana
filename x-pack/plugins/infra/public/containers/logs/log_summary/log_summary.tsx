/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { useCancellableEffect } from '../../../utils/cancellable_effect';
import { useLogSummaryBufferInterval } from './use_log_summary_buffer_interval';
import { fetchLogSummary } from './api/fetch_log_summary';
import { LogEntriesSummaryResponse } from '../../../../common/http_api';

export type LogSummaryBuckets = LogEntriesSummaryResponse['data']['buckets'];

export const useLogSummary = (
  sourceId: string,
  midpointTime: number | null,
  intervalSize: number,
  filterQuery: string | null
) => {
  const [logSummaryBuckets, setLogSummaryBuckets] = useState<LogSummaryBuckets>([]);
  const { start: bufferStart, end: bufferEnd, bucketSize } = useLogSummaryBufferInterval(
    midpointTime,
    intervalSize
  );

  useCancellableEffect(
    getIsCancelled => {
      if (bufferStart === null || bufferEnd === null) {
        return;
      }

      fetchLogSummary({
        sourceId,
        startDate: bufferStart,
        endDate: bufferEnd,
        bucketSize,
        query: filterQuery,
      }).then(response => {
        if (!getIsCancelled()) {
          setLogSummaryBuckets(response.data.buckets);
        }
      });
    },
    [sourceId, filterQuery, bufferStart, bufferEnd, bucketSize]
  );

  return {
    buckets: logSummaryBuckets,
    start: bufferStart,
    end: bufferEnd,
  };
};
