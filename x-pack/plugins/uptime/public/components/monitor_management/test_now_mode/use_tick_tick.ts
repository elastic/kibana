/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useContext } from 'react';
import { UptimeRefreshContext } from '../../../contexts';

export function useTickTick(interval?: number, refresh = true) {
  const { refreshApp } = useContext(UptimeRefreshContext);

  const [nextTick, setNextTick] = useState(Date.now());

  const [tickTick] = useState<NodeJS.Timer>(() =>
    setInterval(() => {
      if (refresh) {
        refreshApp();
      }
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
