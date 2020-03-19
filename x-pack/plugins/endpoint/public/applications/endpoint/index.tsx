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
import { useObservable } from 'react-use';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { RouteCapture } from './view/route_capture';
import { EndpointPluginStartDependencies } from '../../plugin';
import { appStoreFactory } from './store';
import { AlertIndex } from './view/alerts';
import { HostList } from './view/hosts';
import { PolicyList } from './view/policy';
import { PolicyDetails } from './view/policy';
import { HeaderNavigation } from './components/header_nav';
import { EuiThemeProvider } from '../../../../../legacy/common/eui_styled_components';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) {
  coreStart.http.get('/api/endpoint/hello-world');
  const store = appStoreFactory({ coreStart, depsStart });
  ReactDOM.render(
    <AppRoot basename={appBasePath} store={store} coreStart={coreStart} depsStart={depsStart} />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

interface RouterProps {
  basename: string;
  store: Store;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
}

const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({ basename, store, coreStart: { http, notifications, uiSettings }, depsStart: { data } }) => {
    const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));

    return (
      <Provider store={store}>
        <I18nProvider>
          <KibanaContextProvider services={{ http, notifications, data }}>
            <EuiThemeProvider darkMode={isDarkMode}>
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
                    <Route path="/hosts" component={HostList} />
                    <Route path="/alerts" component={AlertIndex} />
                    <Route path="/policy" exact component={PolicyList} />
                    <Route path="/policy/:id" exact component={PolicyDetails} />
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
            </EuiThemeProvider>
          </KibanaContextProvider>
        </I18nProvider>
      </Provider>
    );
  }
);
