/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useContext } from 'react';
import { UptimeRefreshContext } from '../../../contexts';

export function useTickTick() {
  const { refreshApp, lastRefresh } = useContext(UptimeRefreshContext);

  const tickTick = useRef<NodeJS.Timer>(
    setInterval(() => {
      refreshApp();
    }, 5 * 1000)
  );

  useEffect(() => {
    const currTickTick = tickTick.current;
    return () => {
      clearInterval(currTickTick);
    };
  }, [tickTick]);

  return { refreshTimer: tickTick.current, lastRefresh };
}
