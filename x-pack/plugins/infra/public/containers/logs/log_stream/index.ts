/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import useSetState from 'react-use/lib/useSetState';
import { esKuery } from '../../../../../../../src/plugins/data/public';
import { fetchLogEntries } from '../log_entries/api/fetch_log_entries';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { LogEntry, LogEntriesCursor } from '../../../../common/http_api';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

interface LogStreamProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string;
  center?: LogEntriesCursor;
}

interface LogStreamState {
  entries: LogEntry[];
  topCursor: LogEntriesCursor | null;
  bottomCursor: LogEntriesCursor | null;
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

export function useLogStream({
  sourceId,
  startTimestamp,
  endTimestamp,
  query,
  center,
}: LogStreamProps): LogStreamReturn {
  const { services } = useKibanaContextForPlugin();
  const [state, setState] = useSetState<LogStreamState>(INITIAL_STATE);

  const parsedQuery = useMemo(() => {
    return query
      ? JSON.stringify(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query)))
      : null;
  }, [query]);

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
            query: parsedQuery,
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
            query: parsedQuery,
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

  const [nextEntriesPromise, fetchNextEntries] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: () => {
        if (state.bottomCursor === null) {
          throw new Error(
            'useLogState: Cannot fetch next entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
          );
        }

        if (!state.hasMoreAfter) {
          return Promise.resolve({ data: EMPTY_DATA });
        }

        return fetchLogEntries(
          {
            sourceId,
            startTimestamp,
            endTimestamp,
            query: parsedQuery,
            after: state.bottomCursor,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data }) => {
        if (!data.entries.length) {
          return;
        }
        setState((prevState) => ({
          entries: [...prevState.entries, ...data.entries],
          hasMoreAfter: data.hasMoreAfter ?? prevState.hasMoreAfter,
          bottomCursor: data.bottomCursor ?? prevState.bottomCursor,
        }));
      },
    },
    [sourceId, startTimestamp, endTimestamp, query, state.bottomCursor]
  );

  const loadingState = useMemo<LoadingState>(
    () => convertPromiseStateToLoadingState(entriesPromise.state),
    [entriesPromise.state]
  );

  const pageLoadingState = useMemo<LoadingState>(() => {
    const states = [previousEntriesPromise.state, nextEntriesPromise.state];

    if (states.includes('pending')) {
      return 'loading';
    }

    if (states.includes('rejected')) {
      return 'error';
    }

    if (states.includes('resolved')) {
      return 'success';
    }

    return 'uninitialized';
  }, [previousEntriesPromise.state, nextEntriesPromise.state]);

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
