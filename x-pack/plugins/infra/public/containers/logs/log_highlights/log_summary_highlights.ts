/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { fetchLogSummaryHighlights } from './api/fetch_log_summary_highlights';
import { LogEntriesSummaryHighlightsResponse } from '../../../../common/http_api';
import { useBucketSize } from '../log_summary/bucket_size';

export const useLogSummaryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  startTimestamp: number | null,
  endTimestamp: number | null,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const [logSummaryHighlights, setLogSummaryHighlights] = useState<
    LogEntriesSummaryHighlightsResponse['data']
  >([]);

  const bucketSize = useBucketSize(startTimestamp, endTimestamp);

  const [loadLogSummaryHighlightsRequest, loadLogSummaryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!startTimestamp || !endTimestamp || !bucketSize || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await fetchLogSummaryHighlights({
          sourceId,
          startTimestamp,
          endTimestamp,
          bucketSize,
          query: filterQuery,
          highlightTerms,
        });
      },
      onResolve: (response) => {
        setLogSummaryHighlights(response.data);
      },
    },
    [sourceId, startTimestamp, endTimestamp, bucketSize, filterQuery, highlightTerms]
  );

  const debouncedLoadSummaryHighlights = useMemo(() => debounce(loadLogSummaryHighlights, 275), [
    loadLogSummaryHighlights,
  ]);

  useEffect(() => {
    setLogSummaryHighlights([]);
  }, [highlightTerms]);

  useEffect(() => {
    if (
      highlightTerms.filter((highlightTerm) => highlightTerm.length > 0).length &&
      startTimestamp &&
      endTimestamp
    ) {
      debouncedLoadSummaryHighlights();
    } else {
      setLogSummaryHighlights([]);
    }
  }, [
    bucketSize,
    debouncedLoadSummaryHighlights,
    filterQuery,
    highlightTerms,
    sourceVersion,
    startTimestamp,
    endTimestamp,
  ]);

  return {
    logSummaryHighlights,
    loadLogSummaryHighlightsRequest,
  };
};
