/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';
import { useHistory, useLocation, Router, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';

import { AppMountParameters, IUiSettingsClient, ChromeStart } from 'kibana/public';
import { ChromeBreadcrumb } from 'kibana/public';
import { IndexPatternsContract } from 'src/plugins/data/public';

import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { MlContext, MlContextValue } from '../contexts/ml';
import { UrlStateProvider } from '../util/url_state';

import * as routes from './routes';

// custom RouteProps making location non-optional
interface MlRouteProps extends RouteProps {
  location: Location;
}

export interface MlRoute {
  path: string;
  render(props: MlRouteProps, deps: PageDependencies): JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
}

export interface PageProps {
  location: Location;
  deps: PageDependencies;
}

interface PageDependencies {
  config: IUiSettingsClient;
  history: AppMountParameters['history'];
  indexPatterns: IndexPatternsContract;
  setBreadcrumbs: ChromeStart['setBreadcrumbs'];
  redirectToMlAccessDeniedPage: () => Promise<void>;
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <MlContext.Provider value={context}>{children}</MlContext.Provider>
  );
};

/**
 * This component provides compatibility with the previous hash based
 * URL format used by HashRouter. Even if we migrate all internal URLs
 * to one without hashes, we should keep this redirect in place to
 * support legacy bookmarks and as a fallback for unmigrated URLs
 * from other plugins.
 */
const LegacyHashUrlRedirect: FC = ({ children }) => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    if (location.hash.startsWith('#/')) {
      history.push(location.hash.replace('#', ''));
    }
  }, [location.hash]);

  return <>{children}</>;
};

/**
 * `MlRoutes` creates a React Router Route for every routeFactory
 * and passes on the `navigateToPath` helper.
 */
const MlRoutes: FC<{
  pageDeps: PageDependencies;
}> = ({ pageDeps }) => {
  const navigateToPath = useNavigateToPath();
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  return (
    <>
      {Object.entries(routes).map(([name, routeFactory]) => {
        const route = routeFactory(navigateToPath, basePath.get());

        return (
          <Route
            key={name}
            path={route.path}
            exact
            render={(props) => {
              window.setTimeout(() => {
                pageDeps.setBreadcrumbs(route.breadcrumbs);
              });
              return route.render(props, pageDeps);
            }}
          />
        );
      })}
    </>
  );
};

/**
 * `MlRouter` is based on `BrowserRouter` and takes in `ScopedHistory` provided
 * by Kibana. `LegacyHashUrlRedirect` provides compatibility with legacy hash based URLs.
 * `UrlStateProvider` manages state stored in `_g/_a` URL parameters which can be
 * use in components further down via `useUrlState()`.
 */
export const MlRouter: FC<{
  pageDeps: PageDependencies;
}> = ({ pageDeps }) => (
  <Router history={pageDeps.history}>
    <LegacyHashUrlRedirect>
      <UrlStateProvider>
        <div className="ml-app" data-test-subj="mlApp">
          <MlRoutes pageDeps={pageDeps} />
        </div>
      </UrlStateProvider>
    </LegacyHashUrlRedirect>
  </Router>
);
