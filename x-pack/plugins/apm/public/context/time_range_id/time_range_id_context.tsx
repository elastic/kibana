/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useState, useMemo } from 'react';

export const TimeRangeIdContext = createContext<{
  incrementTimeRangeId: () => void;
  timeRangeId: number;
}>({
  incrementTimeRangeId: () => {},
  timeRangeId: 0,
});

export function TimeRangeIdContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const [timeRangeId, setTimeRangeId] = useState(0);

  const api = useMemo(() => {
    return {
      incrementTimeRangeId: () => setTimeRangeId((id) => id + 1),
      timeRangeId,
    };
  }, [timeRangeId, setTimeRangeId]);

  return (
    <TimeRangeIdContext.Provider value={api}>
      {children}
    </TimeRangeIdContext.Provider>
  );
}
