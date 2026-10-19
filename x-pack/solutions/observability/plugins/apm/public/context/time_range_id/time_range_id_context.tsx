/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useState, useMemo, useCallback } from 'react';

export const TimeRangeIdContext = createContext<{
  incrementTimeRangeId: () => void;
  timeRangeId: number;
  isAutoRefreshPaused: boolean;
  pauseAutoRefresh: () => void;
  resumeAutoRefresh: () => void;
}>({
  incrementTimeRangeId: () => {},
  timeRangeId: 0,
  isAutoRefreshPaused: false,
  pauseAutoRefresh: () => {},
  resumeAutoRefresh: () => {},
});

export function TimeRangeIdContextProvider({ children }: { children: React.ReactNode }) {
  const [timeRangeId, setTimeRangeId] = useState(0);
  // Ref-counted so multiple flyouts can independently pause without stomping each other.
  const [pauseCount, setPauseCount] = useState(0);

  // Stable refs — must not be recreated on timeRangeId changes or the useEffect
  // deps in consumer components will trigger spurious cleanup/re-pause cycles.
  const pauseAutoRefresh = useCallback(() => setPauseCount((c) => c + 1), []);
  const resumeAutoRefresh = useCallback(() => setPauseCount((c) => Math.max(0, c - 1)), []);

  const api = useMemo(() => {
    return {
      incrementTimeRangeId: () => setTimeRangeId((id) => id + 1),
      timeRangeId,
      isAutoRefreshPaused: pauseCount > 0,
      pauseAutoRefresh,
      resumeAutoRefresh,
    };
  }, [timeRangeId, pauseCount, pauseAutoRefresh, resumeAutoRefresh]);

  return <TimeRangeIdContext.Provider value={api}>{children}</TimeRangeIdContext.Provider>;
}
