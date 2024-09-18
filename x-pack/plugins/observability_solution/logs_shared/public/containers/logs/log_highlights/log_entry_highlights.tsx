/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeKey } from '@kbn/io-ts-utils';
import { useEffect, useMemo, useState } from 'react';
import { LogViewReference } from '../../../../common';
import { LogEntriesHighlightsResponse } from '../../../../common/http_api';
import { LogEntry } from '../../../../common/log_entry';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { fetchLogEntriesHighlights } from './api/fetch_log_entries_highlights';

export const useLogEntryHighlights = (
  logViewReference: LogViewReference,
  sourceVersion: string | undefined,
  startTimestamp: number | null,
  endTimestamp: number | null,
  centerPoint: TimeKey | null,
  size: number,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const { services } = useKibanaContextForPlugin();
  const [logEntryHighlights, setLogEntryHighlights] = useState<
    LogEntriesHighlightsResponse['data']
  >([]);
  const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!startTimestamp || !endTimestamp || !centerPoint || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await fetchLogEntriesHighlights(
          {
            logView: logViewReference,
            startTimestamp,
            endTimestamp,
            center: centerPoint,
            size,
            query: filterQuery || undefined,
            highlightTerms,
          },
          services.http.fetch
        );
      },
      onResolve: (response) => {
        setLogEntryHighlights(response.data);
      },
    },
    [logViewReference, startTimestamp, endTimestamp, centerPoint, size, filterQuery, highlightTerms]
  );

  useEffect(() => {
    setLogEntryHighlights([]);
  }, [highlightTerms]);

  useEffect(() => {
    if (
      highlightTerms.filter((highlightTerm) => highlightTerm.length > 0).length &&
      startTimestamp &&
      endTimestamp
    ) {
      loadLogEntryHighlights();
    } else {
      setLogEntryHighlights([]);
    }
  }, [
    endTimestamp,
    filterQuery,
    highlightTerms,
    loadLogEntryHighlights,
    sourceVersion,
    startTimestamp,
  ]);

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
