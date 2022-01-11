/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useContext } from 'react';
import { UptimeRefreshContext } from '../../../contexts';

export function useTickTick() {
  const { refreshApp, lastRefresh } = useContext(UptimeRefreshContext);

  const [tickTick] = useState<NodeJS.Timer>(() =>
    setInterval(() => {
      refreshApp();
    }, 5 * 1000)
  );

  useEffect(() => {
    return () => {
      clearInterval(tickTick);
    };
  }, [tickTick]);

  return { refreshTimer: tickTick, lastRefresh };
}
