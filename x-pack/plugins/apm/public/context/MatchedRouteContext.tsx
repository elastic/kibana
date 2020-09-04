/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { ReactChild, useMemo } from 'react';
import { matchPath } from 'react-router-dom';
import { APMRouteDefinition } from '../application/routes';
import { useLocation } from '../hooks/useLocation';

export const MatchedRouteContext = React.createContext<APMRouteDefinition[]>(
  []
);

interface MatchedRouteProviderProps {
  children: ReactChild;
  routes: APMRouteDefinition[];
}
export function MatchedRouteProvider({
  children,
  routes,
}: MatchedRouteProviderProps) {
  const { pathname } = useLocation();

  const contextValue = useMemo(() => {
    return routes.filter((route) => {
      return matchPath(pathname, {
        path: route.path,
      });
    });
  }, [pathname, routes]);

  return (
    <MatchedRouteContext.Provider value={contextValue} children={children} />
  );
}
