/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { useHistory, useLocation, Router, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';

import { AppMountParameters, IUiSettingsClient, ChromeStart } from 'kibana/public';
import { ChromeBreadcrumb } from 'kibana/public';
import { IndexPatternsContract } from 'src/plugins/data/public';
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
  setBreadcrumbs: ChromeStart['setBreadcrumbs'];
  indexPatterns: IndexPatternsContract;
  config: IUiSettingsClient;
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

  if (location.hash.startsWith('#/')) {
    const newHash = location.hash.replace('#', '');
    history.push(newHash);
    return null;
  }

  return <>{children}</>;
};

/**
 * `MlRouter` is based on `BrowserRouter` and takes in `ScopedHistory` provided
 * by Kibana. `LegacyHashUrlRedirect` provides compatibility with legacy hash based URLs.
 * `UrlStateProvider` manages state stored in `_g/_a` URL parameters which can be
 * use in components further down via `useUrlState()`.
 */
export const MlRouter: FC<{
  history: AppMountParameters['history'];
  pageDeps: PageDependencies;
}> = ({ history, pageDeps }) => (
  <Router history={history}>
    <LegacyHashUrlRedirect>
      <UrlStateProvider>
        <div className="ml-app">
          {Object.entries(routes).map(([name, route]) => (
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
          ))}
        </div>
      </UrlStateProvider>
    </LegacyHashUrlRedirect>
  </Router>
);
