/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createBrowserHistory } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from 'react-apollo';
import { CoreStart, AppMountParameters } from 'kibana/public';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
import { EuiThemeProvider } from '../../../observability/public';
import { InfraFrontendLibs } from '../lib/lib';
import { ApolloClientContext } from '../utils/apollo_context';
import { HistoryContext } from '../utils/history_context';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../src/plugins/kibana_react/public';
import { AppRouter } from '../routers';
import '../index.scss';

export const CONTAINER_CLASSNAME = 'infra-container-element';

export async function startApp(
  libs: InfraFrontendLibs,
  core: CoreStart,
  plugins: object,
  params: AppMountParameters,
  Router: AppRouter
) {
  const { element, appBasePath } = params;
  const history = createBrowserHistory({ basename: appBasePath });
  const InfraPluginRoot: React.FunctionComponent = () => {
    const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

    return (
      <core.i18n.Context>
        <EuiErrorBoundary>
          <ApolloProvider client={libs.apolloClient}>
            <ApolloClientContext.Provider value={libs.apolloClient}>
              <EuiThemeProvider darkMode={darkMode}>
                <HistoryContext.Provider value={history}>
                  <Router history={history} />
                </HistoryContext.Provider>
              </EuiThemeProvider>
            </ApolloClientContext.Provider>
          </ApolloProvider>
        </EuiErrorBoundary>
      </core.i18n.Context>
    );
  };

  const App: React.FunctionComponent = () => (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <InfraPluginRoot />
    </KibanaContextProvider>
  );

  // Ensure the element we're handed from application mounting is assigned a class
  // for our index.scss styles to apply to.
  element.className += ` ${CONTAINER_CLASSNAME}`;

  ReactDOM.render(<App />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
