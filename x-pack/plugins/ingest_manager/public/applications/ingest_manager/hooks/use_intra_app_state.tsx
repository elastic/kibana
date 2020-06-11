/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useContext, useMemo } from 'react';
import { ApplicationStart, AppMountParameters } from 'kibana/public';
import { useLocation } from 'react-router-dom';

interface IntraAppState {
  forRoute: string;
  routeState?: {};
}

const IntraAppStateContext = React.createContext<IntraAppState>({ forRoute: '' });
const wasHandled = new WeakSet<IntraAppState>();

/**
 * Provides a bridget between Kibana's ScopedHistory instance (normally used with BrowserRouter)
 * and the Hash router used within the app in order to enable state to be used between kibana
 * apps
 */
export const IntraAppStateProvider = memo<{
  kibanaScopedHistory: AppMountParameters['history'];
  children: React.ReactNode;
}>(({ kibanaScopedHistory, children }) => {
  const internalAppToAppState = useMemo<IntraAppState>(() => {
    return {
      forRoute: kibanaScopedHistory.location.hash.substr(1),
      routeState: (kibanaScopedHistory.location.state || undefined) as Parameters<
        ApplicationStart['navigateToApp']
      >,
    };
  }, [kibanaScopedHistory.location.hash, kibanaScopedHistory.location.state]);
  return (
    <IntraAppStateContext.Provider value={internalAppToAppState}>
      {children}
    </IntraAppStateContext.Provider>
  );
});

/**
 * Retrieve UI Route state from the React Router History for the current URL location
 */
export const useIntraAppState = (): IntraAppState | undefined => {
  const location = useLocation();
  const intraAppState = useContext(IntraAppStateContext);
  if (!intraAppState) {
    throw new Error('Hook called outside of IntraAppStateContext');
  }
  return useMemo((): IntraAppState | undefined => {
    // Due to the use of HashRouter in Ingest, we only want state to be returned
    // once so that it does not impact navigation to the page from within the
    // ingest app. side affect is that the browser back button would not work
    // consistently either.
    if (location.pathname === intraAppState.forRoute && !wasHandled.has(intraAppState)) {
      wasHandled.add(intraAppState);
      return intraAppState;
    }
  }, [intraAppState, location.pathname]);
};
