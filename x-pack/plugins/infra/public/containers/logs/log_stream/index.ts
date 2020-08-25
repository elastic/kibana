/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
import { fetchLogEntries } from '../log_entries/api/fetch_log_entries';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';

interface LogStreamProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
}

interface LogStreamState {
  entries: any[];
  fetchEntries: () => void;
  loadingState: 'uninitialized' | 'loading' | 'success' | 'error';
}

export function useLogStream({
  sourceId,
  startTimestamp,
  endTimestamp,
}: LogStreamProps): LogStreamState {
  const [entries, setEntries] = useState<LogStreamState['entries']>([]);
  const [entriesPromise, fetchEntries] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: () => {
        setEntries([]);
        return fetchLogEntries({ sourceId, startTimestamp, endTimestamp });
      },
      onResolve: ({ data }) => {
        setEntries(data.entries);
      },
    },
    [sourceId, startTimestamp, endTimestamp]
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
