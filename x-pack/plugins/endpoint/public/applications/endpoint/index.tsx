/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import seedrandom from 'seedrandom';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { RouteCapture } from './view/route_capture';
import { appStoreFactory } from './store';
import { AlertIndex } from './view/alerts';
import { ManagementList } from './view/managing';
import { PolicyList } from './view/policy';
import { HeaderNavigation } from './components/header_nav';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(coreStart: CoreStart, { appBasePath, element }: AppMountParameters) {
  coreStart.http.get('/api/endpoint/hello-world');
  const store = appStoreFactory(coreStart);
  ReactDOM.render(<AppRoot basename={appBasePath} store={store} coreStart={coreStart} />, element);
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

interface RouterProps {
  basename: string;
  store: Store;
  coreStart: CoreStart;
}

const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({ basename, store, coreStart: { http } }) => (
    <Provider store={store}>
      <KibanaContextProvider services={{ http }}>
        <I18nProvider>
          <BrowserRouter basename={basename}>
            <RouteCapture>
              <HeaderNavigation basename={basename} />
              <Switch>
                <Route
                  exact
                  path="/"
                  render={() => (
                    <h1 data-test-subj="welcomeTitle">
                      <FormattedMessage
                        id="xpack.endpoint.welcomeTitle"
                        defaultMessage="Hello World"
                      />
                    </h1>
                  )}
                />
                <Route path="/management" component={ManagementList} />
                <Route path="/alerts" component={AlertIndex} />
                <Route path="/policy" exact component={PolicyList} />
                <Route
                  render={() => (
                    <FormattedMessage
                      id="xpack.endpoint.notFound"
                      defaultMessage="Page Not Found"
                    />
                  )}
                />
              </Switch>
            </RouteCapture>
          </BrowserRouter>
        </I18nProvider>
      </KibanaContextProvider>
    </Provider>
  )
);

const random = seedrandom('hi');
console.log('rando', random());
