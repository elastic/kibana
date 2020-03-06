/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';

import { getNextTimeKey, getPreviousTimeKey, TimeKey } from '../../../../common/time';
import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { LogEntryHighlightsMap } from '../../../utils/log_entry';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_entry_highlights.gql_query';

export type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

export const useLogEntryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  startKey: TimeKey | null,
  endKey: TimeKey | null,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const apolloClient = useApolloClient();
  const [logEntryHighlights, setLogEntryHighlights] = useState<LogEntryHighlights>([]);
  const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }
        if (!startKey || !endKey || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await apolloClient.query<
          LogEntryHighlightsQuery.Query,
          LogEntryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: logEntryHighlightsQuery,
          variables: {
            sourceId,
            startKey: getPreviousTimeKey(startKey), // interval boundaries are exclusive
            endKey: getNextTimeKey(endKey), // interval boundaries are exclusive
            filterQuery,
            highlights: [
              {
                query: highlightTerms[0],
                countBefore: 1,
                countAfter: 1,
              },
            ],
          },
        });
      },
      onResolve: response => {
        setLogEntryHighlights(response.data.source.logEntryHighlights);
      },
    },
    [apolloClient, sourceId, startKey, endKey, filterQuery, highlightTerms]
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
      logEntryHighlights.reduce<LogEntryHighlightsMap>(
        (accumulatedLogEntryHighlightsById, { entries }) => {
          return entries.reduce<LogEntryHighlightsMap>((singleHighlightLogEntriesById, entry) => {
            const highlightsForId = singleHighlightLogEntriesById[entry.gid] || [];
            return {
              ...singleHighlightLogEntriesById,
              [entry.gid]: [...highlightsForId, entry],
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
