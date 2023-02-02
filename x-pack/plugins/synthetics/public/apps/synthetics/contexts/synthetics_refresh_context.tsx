/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface SyntheticsRefreshContext {
  lastRefresh: number;
  refreshInterval: number;
  refreshApp: () => void;
}

export const APP_DEFAULT_REFRESH_INTERVAL = 1000 * 3000;

const defaultContext: SyntheticsRefreshContext = {
  lastRefresh: 0,
  refreshInterval: APP_DEFAULT_REFRESH_INTERVAL,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const SyntheticsRefreshContext = createContext(defaultContext);

export const SyntheticsRefreshContextProvider: React.FC = ({ children }) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const refreshApp = useCallback(() => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
  }, [setLastRefresh]);

  const value = useMemo(() => {
    return { lastRefresh, refreshApp, refreshInterval: APP_DEFAULT_REFRESH_INTERVAL };
  }, [lastRefresh, refreshApp]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshApp();
    }, value.refreshInterval);
    return () => clearInterval(interval);
  }, [refreshApp, value.refreshInterval]);

  return <SyntheticsRefreshContext.Provider value={value} children={children} />;
};

export const useSyntheticsRefreshContext = () => useContext(SyntheticsRefreshContext);
