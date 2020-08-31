/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { LogEntry } from '../../../../common/http_api';
import { fetchLogEntries } from '../log_entries/api/fetch_log_entries';
import { esKuery } from '../../../../../../../src/plugins/data/public';

function getQueryFromLogEntry(entry: LogEntry) {
  const expression = Object.entries(entry.context).reduce((kuery, [key, value]) => {
    const currentExpression = `${key} : "${value}"`;
    if (kuery.length > 0) {
      return `${kuery} AND ${currentExpression}`;
    } else {
      return currentExpression;
    }
  }, '');

  return JSON.stringify(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(expression)));
}

interface ViewLogInContextProps {
  sourceId: string;
  startTimestamp: number;
  endTimestamp: number;
}

export interface ViewLogInContextState {
  entries: LogEntry[];
  isLoading: boolean;
  contextEntry?: LogEntry;
}

interface ViewLogInContextCallbacks {
  setContextEntry: (entry?: LogEntry) => void;
}

export const useViewLogInContext = (
  props: ViewLogInContextProps
): [ViewLogInContextState, ViewLogInContextCallbacks] => {
  const [contextEntry, setContextEntry] = useState<LogEntry | undefined>();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { startTimestamp, endTimestamp, sourceId } = props;

  const maybeFetchLogs = useCallback(async () => {
    if (contextEntry) {
      setIsLoading(true);
      const { data } = await fetchLogEntries({
        sourceId,
        startTimestamp,
        endTimestamp,
        center: contextEntry.cursor,
        query: getQueryFromLogEntry(contextEntry),
      });
      setEntries(data.entries);
      setIsLoading(false);
    } else {
      setEntries([]);
      setIsLoading(false);
    }
  }, [contextEntry, startTimestamp, endTimestamp, sourceId]);

  useEffect(() => {
    maybeFetchLogs();
  }, [maybeFetchLogs]);

  return [
    {
      contextEntry,
      entries,
      isLoading,
    },
    {
      setContextEntry,
    },
  ];
};

export const ViewLogInContext = createContainer(useViewLogInContext);
