/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';
import { Router, Redirect, Switch, Route } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider, RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { type AppMountParameters, APP_WRAPPER_CLASS, type CoreStart } from '@kbn/core/public';
import type { CloudSecurityPosturePageId } from '../common/navigation/types';
import { SecuritySolutionContext } from './security_solution_context';
import {
  CLOUD_SECURITY_POSTURE_BASE_PATH,
  cloudPosturePages,
} from '../common/navigation/constants';
import type { CspPageNavigationItem } from '../common/navigation/types';
import { UnknownRoute } from '../components/unknown_route';
import type { CspSecuritySolutionContext } from '../types';
import type { CspClientPluginStartDeps } from '../types';
import { pageToComponentMapping, pageToComponentMappingNoPageTemplate } from './constants';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export interface CspAppDeps {
  core: CoreStart;
  deps: CspClientPluginStartDeps;
  params: AppMountParameters;
}

type CspRouteProps = RouteProps & {
  path: string;
  id: CloudSecurityPosturePageId;
};

// Converts the mapping of page -> component to be of type `RouteProps` while filtering out disabled navigation items
export const getRoutesFromMapping = <T extends string>(
  navigationItems: Record<T, CspPageNavigationItem>,
  componentMapping: Record<T, RouteProps['component']>
): readonly CspRouteProps[] =>
  Object.entries(componentMapping)
    .filter(([key]) => !navigationItems[key as T].disabled)
    .map<CspRouteProps>(([key, component]) => ({
      ...navigationItems[key as T],
      component: component as CspRouteProps['component'],
    }));

// Adds the `SpyRoute` component from the security solution plugin to a CSP route
export const addSpyRouteComponentToRoute = (
  route: CspRouteProps,
  SpyRoute: ReturnType<CspSecuritySolutionContext['getSpyRouteComponent']>
): CspRouteProps => {
  const Component = route.component;
  if (!Component) {
    return route;
  }

  const newRoute = {
    ...route,
    render: (props: RouteComponentProps) => (
      <>
        <SpyRoute pageName={route.id} />
        <Component {...props} />
      </>
    ),
  };

  delete newRoute.component;
  return newRoute;
};

const cspPluginRoutes = getRoutesFromMapping(cloudPosturePages, pageToComponentMapping);
const securitySolutionRoutes = getRoutesFromMapping(
  cloudPosturePages,
  pageToComponentMappingNoPageTemplate
);

export const CspRouter = ({
  routes = securitySolutionRoutes,
  securitySolutionContext,
}: {
  routes?: readonly CspRouteProps[];
  securitySolutionContext?: CspSecuritySolutionContext;
}) => {
  const SpyRoute = securitySolutionContext
    ? securitySolutionContext.getSpyRouteComponent()
    : undefined;

  const routerElement = (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {routes.map((route) => {
          const routeProps = SpyRoute ? addSpyRouteComponentToRoute(route, SpyRoute) : route;
          return <Route key={routeProps.path} {...routeProps} />;
        })}
        <Route exact path={CLOUD_SECURITY_POSTURE_BASE_PATH} component={RedirectToDashboard} />
        <Route path={`${CLOUD_SECURITY_POSTURE_BASE_PATH}/*`} component={UnknownRoute} />
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

export const CspApp = ({ core, deps, params }: CspAppDeps) => (
  <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
    <KibanaContextProvider services={{ ...deps, ...core }}>
      <EuiErrorBoundary>
        <Router history={params.history}>
          <I18nProvider>
            <CspRouter routes={cspPluginRoutes} />
          </I18nProvider>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </RedirectAppLinks>
);

const RedirectToDashboard = () => <Redirect to={cloudPosturePages.dashboard.path} />;
