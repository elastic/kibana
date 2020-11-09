/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
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
  fetchEntries: () => void;
  loadingState: 'uninitialized' | 'loading' | 'success' | 'error';
}

export function useLogStream({
  sourceId,
  startTimestamp,
  endTimestamp,
  query,
  center,
}: LogStreamProps): LogStreamState {
  const { services } = useKibanaContextForPlugin();
  const [entries, setEntries] = useState<LogStreamState['entries']>([]);

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
        setEntries([]);
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
        setEntries(data.entries);
      },
    },
    [sourceId, startTimestamp, endTimestamp, query]
  );

  const loadingState = useMemo(() => convertPromiseStateToLoadingState(entriesPromise.state), [
    entriesPromise.state,
  ]);

  return {
    entries,
    fetchEntries,
    loadingState,
  };
}

function convertPromiseStateToLoadingState(
  state: 'uninitialized' | 'pending' | 'resolved' | 'rejected'
): LogStreamState['loadingState'] {
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
