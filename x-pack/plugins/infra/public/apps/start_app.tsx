/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { CoreStart, AppMountParameters } from 'kibana/public';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
import { EuiThemeProvider } from '../utils/eui_styled_components';
import { InfraFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';
import { ApolloClientContext } from '../utils/apollo_context';
import { ReduxStateContextProvider } from '../utils/redux_context';
import { HistoryContext } from '../utils/history_context';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../src/plugins/kibana_react/public';

export async function startApp(
  libs: InfraFrontendLibs,
  core: CoreStart,
  plugins: object,
  params: AppMountParameters
) {
  const { element } = params;
  const history = createHashHistory();
  const libs$ = new BehaviorSubject(libs);
  const store = createStore({
    apolloClient: libs$.pipe(pluck('apolloClient')),
    observableApi: libs$.pipe(pluck('observableApi')),
  });

  const InfraPluginRoot: React.FunctionComponent = () => {
    const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

    return (
      <core.i18n.Context>
        <EuiErrorBoundary>
          <ReduxStoreProvider store={store}>
            <ReduxStateContextProvider>
              <ApolloProvider client={libs.apolloClient}>
                <ApolloClientContext.Provider value={libs.apolloClient}>
                  <EuiThemeProvider darkMode={darkMode}>
                    <HistoryContext.Provider value={history}>
                      <PageRouter history={history} />
                    </HistoryContext.Provider>
                  </EuiThemeProvider>
                </ApolloClientContext.Provider>
              </ApolloProvider>
            </ReduxStateContextProvider>
          </ReduxStoreProvider>
        </EuiErrorBoundary>
      </core.i18n.Context>
    );
  };

  const App: React.FunctionComponent = () => (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <InfraPluginRoot />
    </KibanaContextProvider>
  );

  ReactDOM.render(<App />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
