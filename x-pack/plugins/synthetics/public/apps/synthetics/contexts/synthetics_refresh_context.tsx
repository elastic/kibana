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
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
}

export const APP_DEFAULT_REFRESH_INTERVAL = 1000 * 30;

const defaultContext: SyntheticsRefreshContext = {
  lastRefresh: 0,
  isPaused: false,
  setIsPaused: () => {},
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

  const [isPaused, setIsPaused] = useState(() => urlIsPaused);
  const [refreshInterval, setRefreshInterval] = useState(
    () => urlRefreshInterval ?? APP_DEFAULT_REFRESH_INTERVAL
  );

  useEffect(() => {
    if (urlRefreshInterval) {
      setRefreshInterval(urlRefreshInterval);
    }
    if (urlIsPaused) {
      setIsPaused(urlIsPaused);
    }
  }, [urlRefreshInterval, urlIsPaused]);

  useEffect(() => {
    if (refreshInterval !== defaultContext.refreshInterval) {
      updateUrlParams({ refreshInterval });
    } else {
      updateUrlParams({ refreshInterval: undefined });
    }
    if (isPaused !== undefined) {
      if (isPaused !== defaultContext.isPaused) {
        updateUrlParams({ refreshPaused: isPaused });
      } else {
        updateUrlParams({ refreshPaused: undefined });
      }
    }
  }, [refreshInterval, isPaused, updateUrlParams]);

  const refreshApp = useCallback(() => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
  }, [setLastRefresh]);

  const value = useMemo(() => {
    return { lastRefresh, refreshApp, refreshInterval, setRefreshInterval, isPaused, setIsPaused };
  }, [isPaused, lastRefresh, refreshApp, refreshInterval]);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const interval = setInterval(() => {
      refreshApp();
    }, value.refreshInterval);
    return () => clearInterval(interval);
  }, [isPaused, refreshApp, value.refreshInterval]);

  return <SyntheticsRefreshContext.Provider value={value} children={children} />;
};

export const useSyntheticsRefreshContext = () => useContext(SyntheticsRefreshContext);
