/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';

interface LogStreamProps {
  startTimestamp: number;
  endTimestamp: number;
}

interface LogStreamState {
  entries: any[];
  fetchEntries: () => void;
}

export function useLogStream({ startTimestamp, endTimestamp }: LogStreamProps): LogStreamState {
  const [entries, setEntries] = useState<LogStreamState['entries']>([]);

  const fetchEntries = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    fetchEntries,
  };
}
