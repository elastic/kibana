/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import createContainer from 'constate';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import useSetState from 'react-use/lib/useSetState';
import { LogEntry, LogEntryCursor } from '../../../../common/log_entry';
import { useSubscription } from '../../../utils/use_observable';
import { LogSourceConfigurationProperties } from '../log_source';
import { useFetchLogEntriesAfter } from './use_fetch_log_entries_after';
import { useFetchLogEntriesAround } from './use_fetch_log_entries_around';
import { useFetchLogEntriesBefore } from './use_fetch_log_entries_before';

export type BuiltEsQuery = ReturnType<typeof buildEsQuery>;

interface LogStreamProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: BuiltEsQuery;
  center?: LogEntryCursor;
  columns?: LogSourceConfigurationProperties['logColumns'];
}

interface LogStreamState {
  entries: LogEntry[];
  topCursor: LogEntryCursor | null;
  bottomCursor: LogEntryCursor | null;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  lastLoadedTime?: Date;
}

type FetchPageCallback = (params?: { force?: boolean; extendTo?: number }) => void;

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
  const [resetOnSuccess, setResetOnSuccess] = useState<boolean>(false);

  // Ensure the pagination keeps working when the timerange gets extended
  const prevStartTimestamp = usePrevious(startTimestamp);
  const prevEndTimestamp = usePrevious(endTimestamp);

  const [cachedQuery, setCachedQuery] = useState(query);
  if (!isEqual(query, cachedQuery)) {
    setCachedQuery(query);
  }

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

  const commonFetchArguments = useMemo(
    () => ({
      sourceId,
      startTimestamp,
      endTimestamp,
      query: cachedQuery,
      columnOverrides: columns,
    }),
    [columns, endTimestamp, cachedQuery, sourceId, startTimestamp]
  );

  const {
    fetchLogEntriesAround,
    isRequestRunning: isLogEntriesAroundRequestRunning,
    logEntriesAroundSearchResponses$,
  } = useFetchLogEntriesAround(commonFetchArguments);

  useSubscription(logEntriesAroundSearchResponses$, {
    next: ({ before, after, combined }) => {
      if ((before.response.data != null || after?.response.data != null) && !combined.isPartial) {
        setState((_prevState) => {
          const prevState = resetOnSuccess ? INITIAL_STATE : _prevState;
          return {
            ...(resetOnSuccess ? INITIAL_STATE : prevState),
            entries: combined.entries,
            hasMoreAfter: combined.hasMoreAfter ?? prevState.hasMoreAfter,
            hasMoreBefore: combined.hasMoreAfter ?? prevState.hasMoreAfter,
            bottomCursor: combined.bottomCursor,
            topCursor: combined.topCursor,
            lastLoadedTime: new Date(),
          };
        });
        if (resetOnSuccess) {
          setResetOnSuccess(false);
        }
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
        setState((_prevState) => {
          const prevState = resetOnSuccess ? INITIAL_STATE : _prevState;
          return {
            ...(resetOnSuccess ? INITIAL_STATE : prevState),
            entries: [...data.entries, ...prevState.entries],
            hasMoreBefore: data.hasMoreBefore ?? prevState.hasMoreBefore,
            topCursor: data.topCursor ?? prevState.topCursor,
            bottomCursor: prevState.bottomCursor ?? data.bottomCursor,
            lastLoadedTime: new Date(),
          };
        });
        if (resetOnSuccess) {
          setResetOnSuccess(false);
        }
      }
    },
  });

  const fetchPreviousEntries = useCallback<FetchPageCallback>(
    (params) => {
      if (state.topCursor === null) {
        throw new Error(
          'useLogStream: Cannot fetch previous entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
        );
      }

      if (!state.hasMoreBefore && !params?.force) {
        return;
      }

      fetchLogEntriesBefore(state.topCursor, {
        size: LOG_ENTRIES_CHUNK_SIZE,
        extendTo: params?.extendTo,
      });
    },
    [fetchLogEntriesBefore, state.topCursor, state.hasMoreBefore]
  );

  const {
    fetchLogEntriesAfter,
    isRequestRunning: isLogEntriesAfterRequestRunning,
    logEntriesAfterSearchResponse$,
  } = useFetchLogEntriesAfter(commonFetchArguments);

  useSubscription(logEntriesAfterSearchResponse$, {
    next: ({ response: { data, isPartial } }) => {
      if (data != null && !isPartial) {
        setState((_prevState) => {
          const prevState = resetOnSuccess ? INITIAL_STATE : _prevState;
          return {
            ...(resetOnSuccess ? INITIAL_STATE : prevState),
            entries: [...prevState.entries, ...data.entries],
            hasMoreAfter: data.hasMoreAfter ?? prevState.hasMoreAfter,
            topCursor: prevState.topCursor ?? data.topCursor,
            bottomCursor: data.bottomCursor ?? prevState.bottomCursor,
            lastLoadedTime: new Date(),
          };
        });
        if (resetOnSuccess) {
          setResetOnSuccess(false);
        }
      }
    },
  });

  const fetchNextEntries = useCallback<FetchPageCallback>(
    (params) => {
      if (state.bottomCursor === null) {
        throw new Error(
          'useLogStream: Cannot fetch next entries. No cursor is set.\nEnsure you have called `fetchEntries` at least once.'
        );
      }

      if (!state.hasMoreAfter && !params?.force) {
        return;
      }

      fetchLogEntriesAfter(state.bottomCursor, {
        size: LOG_ENTRIES_CHUNK_SIZE,
        extendTo: params?.extendTo,
      });
    },
    [fetchLogEntriesAfter, state.bottomCursor, state.hasMoreAfter]
  );

  const fetchEntries = useCallback(() => {
    setState(INITIAL_STATE);

    if (center) {
      fetchLogEntriesAround(center, LOG_ENTRIES_CHUNK_SIZE);
    } else {
      fetchLogEntriesBefore('last', { size: LOG_ENTRIES_CHUNK_SIZE });
    }
  }, [center, fetchLogEntriesAround, fetchLogEntriesBefore, setState]);

  // Specialized version of `fetchEntries` for streaming.
  // - Reset the entries _after_ the network request succeeds.
  // - Ignores `center`.
  const fetchNewestEntries = useCallback(() => {
    setResetOnSuccess(true);
    fetchLogEntriesBefore('last', { size: LOG_ENTRIES_CHUNK_SIZE });
  }, [fetchLogEntriesBefore]);

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
    fetchNewestEntries,
    isLoadingMore,
    isReloading,
  };
}

export const [LogStreamProvider, useLogStreamContext] = createContainer(useLogStream);
