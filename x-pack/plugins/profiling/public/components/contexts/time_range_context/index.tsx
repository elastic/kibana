/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueId } from 'lodash';
import React, { useMemo, useState } from 'react';

export const TimeRangeContext = React.createContext<
  { timeRangeId: string; refresh: () => void } | undefined
>(undefined);

export function TimeRangeContextProvider({ children }: { children: React.ReactElement }) {
  const [timeRangeId, setTimeRangeId] = useState(uniqueId());

  const timeRangeContextValue = useMemo(() => {
    return {
      timeRangeId,
      refresh: () => {
        setTimeRangeId(uniqueId());
      },
    };
  }, [timeRangeId]);

  return (
    <TimeRangeContext.Provider value={timeRangeContextValue}>{children}</TimeRangeContext.Provider>
  );
}
