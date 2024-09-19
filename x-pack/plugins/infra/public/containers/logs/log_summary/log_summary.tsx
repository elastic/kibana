/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import { useCancellableEffect } from '../../../utils/cancellable_effect';
import { fetchLogSummary } from './api/fetch_log_summary';
import { LogEntriesSummaryResponse } from '../../../../common/http_api';
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
  const [logSummaryBuckets, setLogSummaryBuckets] = useState<LogSummaryBuckets>([]);
  const bucketSize = useBucketSize(startTimestamp, endTimestamp);

  useCancellableEffect(
    (getIsCancelled) => {
      if (startTimestamp === null || endTimestamp === null || bucketSize === null) {
        return;
      }

      fetchLogSummary(
        {
          sourceId,
          startTimestamp,
          endTimestamp,
          bucketSize,
          query: filterQuery,
        },
        services.http.fetch
      ).then((response) => {
        if (!getIsCancelled()) {
          setLogSummaryBuckets(response.data.buckets);
        }
      });
    },
    [sourceId, filterQuery, startTimestamp, endTimestamp, bucketSize]
  );

  return {
    buckets: logSummaryBuckets,
    start: startTimestamp,
    end: endTimestamp,
  };
};
