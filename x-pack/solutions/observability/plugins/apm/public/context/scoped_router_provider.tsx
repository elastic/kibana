/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  UNSAFE_LocationContext as ReactRouterLocationContext,
  UNSAFE_NavigationContext as ReactRouterNavigationContext,
  UNSAFE_RouteContext as ReactRouterRouteContext,
} from 'react-router-dom-v5-compat';

/**
 * Resets the React Router v6 context so that nested `<Router>` components
 * (via `CompatRouter` inside `@kbn/shared-ux-router`) do not trigger the
 * v6 invariant "You cannot render a <Router> inside another <Router>".
 *
 * On 9.5, `@kbn/shared-ux-router` still wraps every Router in CompatRouter.
 * Hosts that already have a router (APM pages, dashboard embeddables) need
 * this reset before mounting another in-memory Router.
 */
export function ScopedRouterProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactRouterRouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
      <ReactRouterNavigationContext.Provider
        value={null as unknown as React.ContextType<typeof ReactRouterNavigationContext>}
      >
        <ReactRouterLocationContext.Provider
          value={null as unknown as React.ContextType<typeof ReactRouterLocationContext>}
        >
          {children}
        </ReactRouterLocationContext.Provider>
      </ReactRouterNavigationContext.Provider>
    </ReactRouterRouteContext.Provider>
  );
}
