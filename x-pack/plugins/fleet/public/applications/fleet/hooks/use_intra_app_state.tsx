/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext, useMemo } from 'react';
import { AppMountParameters } from 'kibana/public';
import { useLocation } from 'react-router-dom';
import { AnyIntraAppRouteState } from '../types';

interface IntraAppState<S extends AnyIntraAppRouteState = AnyIntraAppRouteState> {
  forRoute: string;
  routeState?: S;
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
      forRoute: new URL(`${kibanaScopedHistory.location.hash.substr(1)}`, 'http://localhost')
        .pathname,
      routeState: kibanaScopedHistory.location.state as AnyIntraAppRouteState,
    };
  }, [kibanaScopedHistory.location.state, kibanaScopedHistory.location.hash]);
  return (
    <IntraAppStateContext.Provider value={internalAppToAppState}>
      {children}
    </IntraAppStateContext.Provider>
  );
});

/**
 * Retrieve UI Route state from the React Router History for the current URL location.
 * This state can be used by other Kibana Apps to influence certain behaviours in Ingest, for example,
 * redirecting back to an given Application after a craete action.
 */
export function useIntraAppState<S = AnyIntraAppRouteState>():
  | IntraAppState<S>['routeState']
  | undefined {
  const location = useLocation();
  const intraAppState = useContext(IntraAppStateContext);
  if (!intraAppState) {
    throw new Error('Hook called outside of IntraAppStateContext');
  }
  return useMemo(() => {
    // Due to the use of HashRouter in Ingest, we only want state to be returned
    // once so that it does not impact navigation to the page from within the
    // ingest app. side affect is that the browser back button would not work
    // consistently either.

    if (location.pathname === intraAppState.forRoute && !wasHandled.has(intraAppState)) {
      wasHandled.add(intraAppState);
      return intraAppState.routeState as S;
    }

    // Default is to return the state in the Fleet HashRouter, in order to enable use of route state
    // that is used via Kibana's ScopedHistory from within the Fleet HashRouter (ex. things like
    // `core.application.navigateTo()`
    // Once this https://github.com/elastic/kibana/issues/70358 is implemented (move to BrowserHistory
    // using kibana's ScopedHistory), then this work-around can be removed.
    return location.state as S;
  }, [intraAppState, location.pathname, location.state]);
}
