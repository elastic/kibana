/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useSetState } from 'react-use';
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
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
}

interface LogStreamReturn extends LogStreamState {
  fetchEntries: () => void;
  loadingState: 'uninitialized' | 'loading' | 'success' | 'error';
}

const INITIAL_STATE: LogStreamState = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
  // Assume there are pages available until the API proves us wrong
  hasMoreBefore: true,
  hasMoreAfter: true,
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

  const loadingState = useMemo(() => convertPromiseStateToLoadingState(entriesPromise.state), [
    entriesPromise.state,
  ]);

  return {
    ...state,
    fetchEntries,
    loadingState,
  };
}

function convertPromiseStateToLoadingState(
  state: 'uninitialized' | 'pending' | 'resolved' | 'rejected'
): LogStreamReturn['loadingState'] {
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
