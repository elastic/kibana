/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState } from 'react';
import createContainer from 'constate';
import { LogEntry } from '../../../../common/http_api';

interface ViewLogInContextProps {
  startTimestamp: number;
  endTimestamp: number;
}

interface ViewLogInContextState {
  entries: LogEntry[];
  contextEntry?: LogEntry;
}

interface ViewLogInContextCallbacks {
  setContextEntry: (entry?: LogEntry) => void;
}

export const useViewLogInContext = (
  _props: ViewLogInContextProps
): [ViewLogInContextState, ViewLogInContextCallbacks] => {
  const [contextEntry, setContextEntry] = useState<LogEntry | undefined>();
  const [entries, setEntries] = useState<LogEntry[]>([]);

  return [
    {
      contextEntry,
      entries,
    },
    {
      setContextEntry,
    },
  ];
};

export const ViewLogInContext = createContainer(useViewLogInContext);
