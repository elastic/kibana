/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { History, createBrowserHistory, createHashHistory } from 'history';
import { Route, Router, Switch } from 'react-router-dom';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(coreStart: CoreStart, { appBasePath, element }: AppMountParameters) {
  coreStart.http.get('/api/endpoint/hello-world');

  const history = createHashHistory();
  // const history = createBrowserHistory({ basename: appBasePath })
  ReactDOM.render(<AppRoot history={history} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

interface RouterProps {
  history: History;
}

const AppRoot: React.FC<RouterProps> = React.memo(({ history }) => (
  <I18nProvider>
    <Router history={history}>
      <Switch>
        <Route
          exact
          path="/"
          render={() => (
            <h1 data-test-subj="welcomeTitle">
              <FormattedMessage id="xpack.endpoint.welcomeTitle" defaultMessage="Hello World" />
            </h1>
          )}
        />
        <Route
          path="/management"
          render={() => (
            <h1 data-test-subj="management">
              <FormattedMessage id="xpack.endpoint.management" defaultMessage="Manage Endpoints" />
            </h1>
          )}
        />
        <Route
          render={() => (
            <FormattedMessage id="xpack.endpoint.notFound" defaultMessage="Page Not Found" />
          )}
        />
      </Switch>
    </Router>
  </I18nProvider>
));
