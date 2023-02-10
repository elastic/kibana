/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUrlParams } from '../hooks';

interface SyntheticsRefreshContext {
  lastRefresh: number;
  refreshInterval: number;
  refreshApp: () => void;
  setRefreshInterval: (interval: number) => void;
  refreshPaused: boolean;
  setRefreshPaused: (isPaused: boolean) => void;
}

export const APP_DEFAULT_REFRESH_INTERVAL = 1000 * 30;

const defaultContext: SyntheticsRefreshContext = {
  lastRefresh: 0,
  refreshPaused: false,
  setRefreshPaused: () => {},
  setRefreshInterval: () => {},
  refreshInterval: APP_DEFAULT_REFRESH_INTERVAL,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const SyntheticsRefreshContext = createContext(defaultContext);

export const SyntheticsRefreshContextProvider: React.FC = ({ children }) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const [getUrlsParams, updateUrlParams] = useUrlParams();

  const { refreshInterval: urlRefreshInterval, refreshPaused: urlIsPaused } = getUrlsParams();

  const [refreshPaused, setRefreshPaused] = useState(() => urlIsPaused);
  const [refreshInterval, setRefreshInterval] = useState(
    () => urlRefreshInterval ?? APP_DEFAULT_REFRESH_INTERVAL
  );

  useEffect(() => {
    if (urlRefreshInterval) {
      setRefreshInterval(urlRefreshInterval);
    }
    if (urlIsPaused !== undefined) {
      setRefreshPaused(urlIsPaused);
    }
  }, [urlRefreshInterval, urlIsPaused]);

  useEffect(() => {
    if (refreshInterval === APP_DEFAULT_REFRESH_INTERVAL) {
      updateUrlParams({ refreshInterval: undefined }, true);
    } else {
      updateUrlParams({ refreshInterval }, true);
    }
  }, [refreshInterval, updateUrlParams]);

  useEffect(() => {
    if (!refreshPaused) {
      updateUrlParams({ refreshPaused: undefined }, true);
    } else {
      updateUrlParams({ refreshPaused }, true);
    }
  }, [refreshPaused, updateUrlParams]);

  const refreshApp = useCallback(() => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
  }, [setLastRefresh]);

  const value = useMemo(() => {
    return {
      lastRefresh,
      refreshApp,
      refreshInterval,
      setRefreshInterval,
      refreshPaused,
      setRefreshPaused,
    };
  }, [refreshPaused, lastRefresh, refreshApp, refreshInterval]);

  useEffect(() => {
    if (refreshPaused) {
      return;
    }
    const interval = setInterval(() => {
      refreshApp();
    }, value.refreshInterval);
    return () => clearInterval(interval);
  }, [refreshPaused, refreshApp, value.refreshInterval]);

  return <SyntheticsRefreshContext.Provider value={value} children={children} />;
};

export const useSyntheticsRefreshContext = () => useContext(SyntheticsRefreshContext);
