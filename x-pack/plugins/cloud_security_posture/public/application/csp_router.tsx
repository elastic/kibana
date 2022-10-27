/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, type RouteProps, Switch } from 'react-router-dom';
import { benchmarksNavigation, cloudPosturePages } from '../common/navigation/constants';
import type { CspSecuritySolutionContext } from '..';
import type { CspPageNavigationItem } from '../common/navigation/types';
import { SecuritySolutionContext, useSecuritySolutionContext } from './security_solution_context';
import * as pages from '../pages';

const CspRoute: React.FC<RouteProps & { disabled?: boolean }> = ({ disabled, children, ...item }) =>
  disabled ? null : <Route {...item}>{children}</Route>;

const CspRouteWithSpy: React.FC<RouteProps & CspPageNavigationItem> = ({
  component: Component,
  children,
  ...cspRoute
}) => {
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();
  return (
    <CspRoute
      {...cspRoute}
      render={(props) => (
        <>
          {SpyRoute && <SpyRoute pageName={cspRoute.id} />}
          {Component && <Component {...props} />}
        </>
      )}
    />
  );
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/** Props for the cloud security posture router component */
export interface CspRouterProps {
  securitySolutionContext?: CspSecuritySolutionContext;
}

export const CspRouter = ({ securitySolutionContext }: CspRouterProps) => {
  const routerElement = (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <CspRouteWithSpy {...cloudPosturePages.findings} component={pages.Findings} />
        <CspRouteWithSpy {...cloudPosturePages.dashboard} component={pages.ComplianceDashboard} />

        <CspRoute {...cloudPosturePages.benchmarks}>
          <Switch>
            <CspRoute {...benchmarksNavigation.rules} component={pages.Rules} />
            <CspRouteWithSpy {...cloudPosturePages.benchmarks} component={pages.Benchmarks} />
          </Switch>
        </CspRoute>

        <Route>
          <Redirect to={cloudPosturePages.dashboard.path} />
        </Route>
      </Switch>
    </QueryClientProvider>
  );

  if (securitySolutionContext) {
    return (
      <SecuritySolutionContext.Provider value={securitySolutionContext}>
        {routerElement}
      </SecuritySolutionContext.Provider>
    );
  }

  return <>{routerElement}</>;
};

// Using a default export for usage with `React.lazy`
// eslint-disable-next-line import/no-default-export
export { CspRouter as default };
