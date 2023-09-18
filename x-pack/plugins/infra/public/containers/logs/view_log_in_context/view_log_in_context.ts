/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import createContainer from 'constate';
import { LogEntry, LogViewReference } from '@kbn/logs-shared-plugin/common';

interface ViewLogInContextProps {
  logViewReference: LogViewReference;
  startTimestamp: number;
  endTimestamp: number;
}

export interface ViewLogInContextState extends ViewLogInContextProps {
  contextEntry?: LogEntry;
}

interface ViewLogInContextCallbacks {
  setContextEntry: (entry?: LogEntry) => void;
}

export const useViewLogInContext = (
  props: ViewLogInContextProps
): [ViewLogInContextState, ViewLogInContextCallbacks] => {
  const [contextEntry, setContextEntry] = useState<LogEntry | undefined>();
  const { startTimestamp, endTimestamp, logViewReference } = props;

  return [
    {
      startTimestamp,
      endTimestamp,
      logViewReference,
      contextEntry,
    },
    {
      setContextEntry,
    },
  ];
};

export const [ViewLogInContextProvider, useViewLogInProviderContext] =
  createContainer(useViewLogInContext);
