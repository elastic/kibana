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

export const useLogSummaryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  start: number | null,
  end: number | null,
  bucketSize: number,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const [logSummaryHighlights, setLogSummaryHighlights] = useState<
    LogEntriesSummaryHighlightsResponse['data']
  >([]);

  const [loadLogSummaryHighlightsRequest, loadLogSummaryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!start || !end || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await fetchLogSummaryHighlights({
          sourceId,
          startDate: start,
          endDate: end,
          bucketSize,
          query: filterQuery,
          highlightTerms,
        });
      },
      onResolve: response => {
        setLogSummaryHighlights(response.data);
      },
    },
    [sourceId, start, end, bucketSize, filterQuery, highlightTerms]
  );

  const debouncedLoadSummaryHighlights = useMemo(() => debounce(loadLogSummaryHighlights, 275), [
    loadLogSummaryHighlights,
  ]);

  useEffect(() => {
    setLogSummaryHighlights([]);
  }, [highlightTerms]);

  useEffect(() => {
    if (highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length && start && end) {
      debouncedLoadSummaryHighlights();
    } else {
      setLogSummaryHighlights([]);
    }
  }, [
    bucketSize,
    debouncedLoadSummaryHighlights,
    end,
    filterQuery,
    highlightTerms,
    sourceVersion,
    start,
  ]);

  return {
    logSummaryHighlights,
    loadLogSummaryHighlightsRequest,
  };
};
