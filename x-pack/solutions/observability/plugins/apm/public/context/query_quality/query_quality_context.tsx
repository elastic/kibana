/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../../hooks/use_local_storage';

export enum QueryQualityLevel {
  fastest = 0,
  fast = 1,
  default = 2,
  accurate = 3,
  mostAccurate = 4,
}

const QUALITY_MULTIPLIERS: Record<QueryQualityLevel, number> = {
  [QueryQualityLevel.fastest]: 0.25,
  [QueryQualityLevel.fast]: 0.5,
  [QueryQualityLevel.default]: 1,
  [QueryQualityLevel.accurate]: 2,
  [QueryQualityLevel.mostAccurate]: 4,
};

interface QueryQualityContextValue {
  qualityLevel: QueryQualityLevel;
  setQualityLevel: (level: QueryQualityLevel) => void;
  numBucketsMultiplier: number;
}

const QueryQualityContext = createContext<QueryQualityContextValue>({
  qualityLevel: QueryQualityLevel.default,
  setQualityLevel: () => {},
  numBucketsMultiplier: 1,
});

export const useQueryQuality = () => useContext(QueryQualityContext);

export const getAdjustedNumBuckets = (base: number, multiplier: number): number =>
  Math.min(100, Math.max(1, Math.round(base * multiplier)));

export function QueryQualityProvider({ children }: { children: ReactNode }) {
  const [storedLevel, setStoredLevel] = useLocalStorage<QueryQualityLevel>(
    'apm.queryQualityLevel',
    QueryQualityLevel.default
  );

  const [qualityLevel, setQualityLevelState] = useState<QueryQualityLevel>(storedLevel);

  const setQualityLevel = useCallback(
    (level: QueryQualityLevel) => {
      setQualityLevelState(level);
      setStoredLevel(level);
    },
    [setStoredLevel]
  );

  const value = useMemo(
    () => ({
      qualityLevel,
      setQualityLevel,
      numBucketsMultiplier: QUALITY_MULTIPLIERS[qualityLevel],
    }),
    [qualityLevel, setQualityLevel]
  );

  return <QueryQualityContext.Provider value={value}>{children}</QueryQualityContext.Provider>;
}
