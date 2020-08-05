/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, ReactChild } from 'react';
import { matchPath } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation';
import { BreadcrumbRoute } from '../components/app/Main/ProvideBreadcrumbs';

export const MatchedRouteContext = React.createContext<BreadcrumbRoute[]>([]);

interface MatchedRouteProviderProps {
  children: ReactChild;
  routes: BreadcrumbRoute[];
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
