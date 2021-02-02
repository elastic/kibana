/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import useSetState from 'react-use/lib/useSetState';
import { esKuery, esQuery, Query } from '../../../../../../../src/plugins/data/public';
import { LogEntry, LogEntryCursor } from '../../../../common/log_entry';
import { useSubscription } from '../../../utils/use_observable';
import { LogSourceConfigurationProperties } from '../log_source';
import { useFetchLogEntriesAfter } from './use_fetch_log_entries_after';
import { useFetchLogEntriesAround } from './use_fetch_log_entries_around';
import { useFetchLogEntriesBefore } from './use_fetch_log_entries_before';

interface LogStreamProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string | Query;
  center?: LogEntryCursor;
  columns?: LogSourceConfigurationProperties['logColumns'];
}

interface LogStreamState {
  entries: LogEntry[];
  topCursor: LogEntryCursor | null;
  bottomCursor: LogEntryCursor | null;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

const INITIAL_STATE: LogStreamState = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
  // Assume there are pages available until the API proves us wrong
  hasMoreBefore: true,
  hasMoreAfter: true,
};

const LOG_ENTRIES_CHUNK_SIZE = 200;

export function useLogStream({
  sourceId,
  startTimestamp,
  endTimestamp,
  query,
  center,
  columns,
}: LogStreamProps) {
  const [state, setState] = useSetState<LogStreamState>(INITIAL_STATE);

  // Ensure the pagination keeps working when the timerange gets extended
  const prevStartTimestamp = usePrevious(startTimestamp);
  const prevEndTimestamp = usePrevious(endTimestamp);

  useEffect(() => {
    if (prevStartTimestamp && prevStartTimestamp > startTimestamp) {
      setState({ hasMoreBefore: true });
    }
  }, [prevStartTimestamp, startTimestamp, setState]);

  useEffect(() => {
    if (prevEndTimestamp && prevEndTimestamp < endTimestamp) {
      setState({ hasMoreAfter: true });
    }
  }, [prevEndTimestamp, endTimestamp, setState]);

  const parsedQuery = useMemo(() => {
    if (!query) {
      return undefined;
    } else if (typeof query === 'string') {
      return esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query));
    } else if (query.language === 'kuery') {
      return esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query.query as string));
    } else if (query.language === 'lucene') {
      return esQuery.luceneStringToDsl(query.query as string);
    } else {
      return undefined;
    }
  }, [query]);

  const commonFetchArguments = useMemo(
    () => ({
      sourceId,
      startTimestamp,
      endTimestamp,
      query: parsedQuery,
      columnOverrides: columns,
    }),
    [columns, endTimestamp, parsedQuery, sourceId, startTimestamp]
  );

  const {
    fetchLogEntriesAround,
    isRequestRunning: isLogEntriesAroundRequestRunning,
    logEntriesAroundSearchResponses$,
  } = useFetchLogEntriesAround(commonFetchArguments);

  useSubscription(logEntriesAroundSearchResponses$, {
    next: ({ before, after, combined }) => {
      if ((before.response.data != null || after?.response.data != null) && !combined.isPartial) {
        setState((prevState) => ({
          ...prevState,
          entries: combined.entries,
          hasMoreAfter: combined.hasMoreAfter ?? prevState.hasMoreAfter,
          hasMoreBefore: combined.hasMoreAfter ?? prevState.hasMoreAfter,
          bottomCursor: combined.bottomCursor,
          topCursor: combined.topCursor,
        }));
      }
    },
  });

  const {
    fetchLogEntriesBefore,
    isRequestRunning: isLogEntriesBeforeRequestRunning,
    logEntriesBeforeSearchResponse$,
  } = useFetchLogEntriesBefore(commonFetchArguments);

  useSubscription(logEntriesBeforeSearchResponse$, {
    next: ({ response: { data, isPartial } }) => {
      if (data != null && !isPartial) {
        setState((prevState) => ({
          ...prevState,
          entries: [...data.entries, ...prevState.entries],
          hasMoreBefore: data.hasMoreBefore ?? prevState.hasMoreBefore,
          topCursor: data.topCursor ?? prevState.topCursor,
          bottomCursor: prevState.bottomCursor ?? data.bottomCursor,
        }));
      }
    },
  });

  const fetchPreviousEntries = useCallback(() => {
    if (state.topCursor === null) {
      throw new Error(
        'useLogState: Cannot fetch previous entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
      );
    }

    if (!state.hasMoreBefore) {
      return;
    }

    fetchLogEntriesBefore(state.topCursor, LOG_ENTRIES_CHUNK_SIZE);
  }, [fetchLogEntriesBefore, state.topCursor, state.hasMoreBefore]);

  const {
    fetchLogEntriesAfter,
    isRequestRunning: isLogEntriesAfterRequestRunning,
    logEntriesAfterSearchResponse$,
  } = useFetchLogEntriesAfter(commonFetchArguments);

  useSubscription(logEntriesAfterSearchResponse$, {
    next: ({ response: { data, isPartial } }) => {
      if (data != null && !isPartial) {
        setState((prevState) => ({
          ...prevState,
          entries: [...prevState.entries, ...data.entries],
          hasMoreAfter: data.hasMoreAfter ?? prevState.hasMoreAfter,
          topCursor: prevState.topCursor ?? data.topCursor,
          bottomCursor: data.bottomCursor ?? prevState.bottomCursor,
        }));
      }
    },
  });

  const fetchNextEntries = useCallback(() => {
    if (state.bottomCursor === null) {
      throw new Error(
        'useLogState: Cannot fetch next entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
      );
    }

    if (!state.hasMoreAfter) {
      return;
    }

    fetchLogEntriesAfter(state.bottomCursor, LOG_ENTRIES_CHUNK_SIZE);
  }, [fetchLogEntriesAfter, state.bottomCursor, state.hasMoreAfter]);

  const fetchEntries = useCallback(() => {
    setState(INITIAL_STATE);

    if (center) {
      fetchLogEntriesAround(center, LOG_ENTRIES_CHUNK_SIZE);
    } else {
      fetchLogEntriesBefore('last', LOG_ENTRIES_CHUNK_SIZE);
    }
  }, [center, fetchLogEntriesAround, fetchLogEntriesBefore, setState]);

  const isReloading = useMemo(
    () =>
      isLogEntriesAroundRequestRunning ||
      (state.bottomCursor == null && state.topCursor == null && isLogEntriesBeforeRequestRunning),
    [
      isLogEntriesAroundRequestRunning,
      isLogEntriesBeforeRequestRunning,
      state.bottomCursor,
      state.topCursor,
    ]
  );

  const isLoadingMore = useMemo(
    () => isLogEntriesBeforeRequestRunning || isLogEntriesAfterRequestRunning,
    [isLogEntriesAfterRequestRunning, isLogEntriesBeforeRequestRunning]
  );

  return {
    ...state,
    fetchEntries,
    fetchNextEntries,
    fetchPreviousEntries,
    isLoadingMore,
    isReloading,
  };
}
