/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, type RouteProps, Switch } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { benchmarksNavigation, cloudPosturePages } from '../common/navigation/constants';
import type { CspSecuritySolutionContext } from '..';
import type { CspPageNavigationItem } from '../common/navigation/types';
import { SecuritySolutionContext, useSecuritySolutionContext } from './security_solution_context';
import * as pages from '../pages';

type CspRouteProps = Omit<RouteProps, 'render'> & CspPageNavigationItem;

const CspRoute: React.FC<CspRouteProps> = ({
  id,
  children,
  component: Component,
  disabled = false,
  omitSecuritySpy = false,
  ...cspRouteProps
}) => {
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();

  if (disabled) {
    return null;
  }

  const routeProps: RouteProps = {
    ...cspRouteProps,
    ...(Component && {
      render: (renderProps) => (
        <TrackApplicationView viewId={id}>
          {!omitSecuritySpy && SpyRoute && <SpyRoute pageName={id} />}
          <Component {...renderProps} />
        </TrackApplicationView>
      ),
    }),
  };

  return <Route {...routeProps}>{children}</Route>;
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
        <CspRoute {...cloudPosturePages.findings} component={pages.Findings} />
        <CspRoute {...cloudPosturePages.dashboard} component={pages.ComplianceDashboard} />

        <CspRoute {...cloudPosturePages.benchmarks}>
          <Switch>
            <CspRoute {...benchmarksNavigation.rules} component={pages.Rules} />
            <CspRoute {...cloudPosturePages.benchmarks} component={pages.Benchmarks} />
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
