/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';

import { getNextTimeKey, getPreviousTimeKey, TimeKey } from '../../../../common/time';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { fetchLogEntriesHighlights } from './api/fetch_log_entries_highlights';
import { LogEntry, LogEntriesHighlightsResponse } from '../../../../common/http_api';

export const useLogEntryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  startKey: TimeKey | null,
  endKey: TimeKey | null,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const [logEntryHighlights, setLogEntryHighlights] = useState<
    LogEntriesHighlightsResponse['data']
  >([]);
  const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!startKey || !endKey || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await fetchLogEntriesHighlights({
          sourceId,
          startTimestamp: getPreviousTimeKey(startKey).time, // interval boundaries are exclusive
          endTimestamp: getNextTimeKey(endKey).time, // interval boundaries are exclusive
          query: filterQuery || undefined,
          highlightTerms,
        });
      },
      onResolve: response => {
        setLogEntryHighlights(response.data);
      },
    },
    [sourceId, startKey, endKey, filterQuery, highlightTerms]
  );

  useEffect(() => {
    setLogEntryHighlights([]);
  }, [highlightTerms]);

  useEffect(() => {
    if (
      highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length &&
      startKey &&
      endKey
    ) {
      loadLogEntryHighlights();
    } else {
      setLogEntryHighlights([]);
    }
  }, [endKey, filterQuery, highlightTerms, loadLogEntryHighlights, sourceVersion, startKey]);

  const logEntryHighlightsById = useMemo(
    () =>
      logEntryHighlights.reduce<Record<string, LogEntry[]>>(
        (accumulatedLogEntryHighlightsById, highlightData) => {
          return highlightData.entries.reduce((singleHighlightLogEntriesById, entry) => {
            const highlightsForId = singleHighlightLogEntriesById[entry.id] || [];
            return {
              ...singleHighlightLogEntriesById,
              [entry.id]: [...highlightsForId, entry],
            };
          }, accumulatedLogEntryHighlightsById);
        },
        {}
      ),
    [logEntryHighlights]
  );

  return {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  };
};
