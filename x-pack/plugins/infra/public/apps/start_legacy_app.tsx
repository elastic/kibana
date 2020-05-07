/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createBrowserHistory } from 'history';
import React from 'react';
import url from 'url';
import ReactDOM from 'react-dom';
import { AppMountParameters } from 'kibana/public';
import { Route, Router, Switch, RouteProps } from 'react-router-dom';
// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';

// This exists purely to facilitate legacy app/infra URL redirects.
// It will be removed in 8.0.0.
export async function startLegacyApp(params: AppMountParameters) {
  const { element } = params;
  const history = createBrowserHistory();

  const App: React.FunctionComponent = () => {
    return (
      <EuiErrorBoundary>
        <Router history={history}>
          <Switch>
            <Route
              path={'/'}
              render={({ location }: RouteProps) => {
                if (!location) {
                  return null;
                }

                let nextPath = '';
                let nextBasePath = '';
                let nextSearch;

                if (
                  location.hash.indexOf('#infrastructure') > -1 ||
                  location.hash.indexOf('#/infrastructure') > -1
                ) {
                  nextPath = location.hash.replace(
                    new RegExp(
                      '#infrastructure/|#/infrastructure/|#/infrastructure|#infrastructure',
                      'g'
                    ),
                    ''
                  );
                  nextBasePath = location.pathname.replace('app/infra', 'app/metrics');
                } else if (
                  location.hash.indexOf('#logs') > -1 ||
                  location.hash.indexOf('#/logs') > -1
                ) {
                  nextPath = location.hash.replace(
                    new RegExp('#logs/|#/logs/|#/logs|#logs', 'g'),
                    ''
                  );
                  nextBasePath = location.pathname.replace('app/infra', 'app/logs');
                } else {
                  // This covers /app/infra and /app/infra/home (both of which used to render
                  // the metrics inventory page)
                  nextPath = 'inventory';
                  nextBasePath = location.pathname.replace('app/infra', 'app/metrics');
                  nextSearch = undefined;
                }

                // app/inra#infrastructure/metrics/:type/:node was changed to app/metrics/detail/:type/:node, this
                // accounts for that edge case
                nextPath = nextPath.replace('metrics/', 'detail/');

                // Query parameters (location.search) will arrive as part of location.hash and not location.search
                const nextPathParts = nextPath.split('?');
                nextPath = nextPathParts[0];
                nextSearch = nextPathParts[1] ? nextPathParts[1] : undefined;

                let nextUrl = url.format({
                  pathname: `${nextBasePath}/${nextPath}`,
                  hash: undefined,
                  search: nextSearch,
                });

                nextUrl = nextUrl.replace('//', '/');

                window.location.href = nextUrl;

                return null;
              }}
            />
          </Switch>
        </Router>
      </EuiErrorBoundary>
    );
  };

  ReactDOM.render(<App />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
