/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useMemo, useState } from 'react';
import { Store } from 'redux';
import { triggerAppRefresh } from '../state/actions';

interface UptimeRefreshContext {
  lastRefresh: number;
  refreshApp: () => void;
}

interface RefreshContextProps {
  store: Store<any>;
}

const defaultContext: UptimeRefreshContext = {
  lastRefresh: 0,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const UptimeRefreshContext = createContext(defaultContext);

export const UptimeRefreshContextProvider: React.FC<RefreshContextProps> = ({
  children,
  store,
}) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const value = useMemo(() => {
    const refreshApp = () => {
      const refreshTime = Date.now();
      setLastRefresh(refreshTime);
      store.dispatch(triggerAppRefresh(refreshTime));
    };
    return { lastRefresh, refreshApp };
  }, [lastRefresh, store]);

  return <UptimeRefreshContext.Provider value={value} children={children} />;
};
