/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import useSetState from 'react-use/lib/useSetState';
import { esKuery } from '../../../../../../../src/plugins/data/public';
import { LogEntry, LogEntryCursor } from '../../../../common/log_entry';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useSubscription } from '../../../utils/use_observable';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { fetchLogEntries } from '../log_entries/api/fetch_log_entries';
import { LogSourceConfigurationProperties } from '../log_source';
import { useFetchLogEntriesAfter } from './use_fetch_log_entries_after';

interface LogStreamProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string;
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

type LoadingState = 'uninitialized' | 'loading' | 'success' | 'error';

interface LogStreamReturn extends LogStreamState {
  fetchEntries: () => void;
  fetchPreviousEntries: () => void;
  fetchNextEntries: () => void;
  loadingState: LoadingState;
  pageLoadingState: LoadingState;
}

const INITIAL_STATE: LogStreamState = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
  // Assume there are pages available until the API proves us wrong
  hasMoreBefore: true,
  hasMoreAfter: true,
};

const EMPTY_DATA = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
};

const LOG_ENTRIES_CHUNK_SIZE = 200;

export function useLogStream({
  sourceId,
  startTimestamp,
  endTimestamp,
  query,
  center,
  columns,
}: LogStreamProps): LogStreamReturn {
  const { services } = useKibanaContextForPlugin();
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
    return query ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query)) : undefined;
  }, [query]);

  const serializedQuery = useMemo(() => {
    return parsedQuery ? JSON.stringify(parsedQuery) : undefined;
  }, [parsedQuery]);

  // Callbacks
  const [entriesPromise, fetchEntries] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: () => {
        setState(INITIAL_STATE);
        const fetchPosition = center ? { center } : { before: 'last' };

        return fetchLogEntries(
          {
            sourceId,
            startTimestamp,
            endTimestamp,
            query: serializedQuery,
            columns,
            ...fetchPosition,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data }) => {
        setState((prevState) => ({
          ...data,
          hasMoreBefore: data.hasMoreBefore ?? prevState.hasMoreBefore,
          hasMoreAfter: data.hasMoreAfter ?? prevState.hasMoreAfter,
        }));
      },
    },
    [sourceId, startTimestamp, endTimestamp, query]
  );

  const [previousEntriesPromise, fetchPreviousEntries] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: () => {
        if (state.topCursor === null) {
          throw new Error(
            'useLogState: Cannot fetch previous entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
          );
        }

        if (!state.hasMoreBefore) {
          return Promise.resolve({ data: EMPTY_DATA });
        }

        return fetchLogEntries(
          {
            sourceId,
            startTimestamp,
            endTimestamp,
            query: serializedQuery,
            before: state.topCursor,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data }) => {
        if (!data.entries.length) {
          return;
        }
        setState((prevState) => ({
          entries: [...data.entries, ...prevState.entries],
          hasMoreBefore: data.hasMoreBefore ?? prevState.hasMoreBefore,
          topCursor: data.topCursor ?? prevState.topCursor,
        }));
      },
    },
    [sourceId, startTimestamp, endTimestamp, query, state.topCursor]
  );

  const {
    fetchLogEntriesAfter,
    isRequestRunning: isLogEntriesAfterRequestRunning,
    isResponsePartial: isLogEntriesAfterResponsePartial,
    logEntriesAfterSearchResponse$,
  } = useFetchLogEntriesAfter({
    sourceId,
    startTimestamp,
    endTimestamp,
    query: parsedQuery,
  });

  useSubscription(logEntriesAfterSearchResponse$, {
    next: ({ response: { data, isPartial } }) => {
      if (data != null && !isPartial) {
        setState((prevState) => ({
          ...prevState,
          entries: [...prevState.entries, ...data.entries],
          hasMoreAfter: data.hasMoreAfter ?? prevState.hasMoreAfter,
          bottomCursor: data.bottomCursor ?? prevState.bottomCursor,
        }));
      }
    },
    error: (err) => {
      console.error(err);
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

  const loadingState = useMemo<LoadingState>(
    () => convertPromiseStateToLoadingState(entriesPromise.state),
    [entriesPromise.state]
  );

  const pageLoadingState = useMemo<LoadingState>(() => {
    if (previousEntriesPromise.state === 'pending' || isLogEntriesAfterRequestRunning) {
      return 'loading';
    }

    if (
      previousEntriesPromise.state === 'rejected' ||
      (!isLogEntriesAfterRequestRunning && isLogEntriesAfterResponsePartial)
    ) {
      return 'error';
    }

    if (
      previousEntriesPromise.state === 'resolved' ||
      (!isLogEntriesAfterRequestRunning && !isLogEntriesAfterResponsePartial)
    ) {
      return 'success';
    }

    return 'uninitialized';
  }, [
    isLogEntriesAfterRequestRunning,
    isLogEntriesAfterResponsePartial,
    previousEntriesPromise.state,
  ]);

  return {
    ...state,
    fetchEntries,
    fetchPreviousEntries,
    fetchNextEntries,
    loadingState,
    pageLoadingState,
  };
}

function convertPromiseStateToLoadingState(
  state: 'uninitialized' | 'pending' | 'resolved' | 'rejected'
): LoadingState {
  switch (state) {
    case 'uninitialized':
      return 'uninitialized';
    case 'pending':
      return 'loading';
    case 'resolved':
      return 'success';
    case 'rejected':
      return 'error';
  }
}
