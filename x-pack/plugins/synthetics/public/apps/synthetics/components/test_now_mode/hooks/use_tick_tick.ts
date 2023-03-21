/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export function useTickTick(interval?: number) {
  const [nextTick, setNextTick] = useState(Date.now());

  const [tickTick] = useState<NodeJS.Timer>(() =>
    setInterval(() => {
      setNextTick(Date.now());
    }, interval ?? 5 * 1000)
  );

  useEffect(() => {
    return () => {
      clearInterval(tickTick);
    };
  }, [tickTick]);

  return { refreshTimer: tickTick, lastRefresh: nextTick };
}
