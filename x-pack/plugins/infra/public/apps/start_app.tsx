/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Provider as ConstateProvider } from 'constate';
import { createHashHistory } from 'history';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
import { I18nContext } from 'ui/i18n';
import { EuiThemeProvider } from '../../../../common/eui_styled_components';
import { InfraFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';
import { ApolloClientContext } from '../utils/apollo_context';

export async function startApp(libs: InfraFrontendLibs) {
  const history = createHashHistory();

  const libs$ = new BehaviorSubject(libs);
  const store = createStore({
    apolloClient: libs$.pipe(pluck('apolloClient')),
    observableApi: libs$.pipe(pluck('observableApi')),
  });

  libs.framework.render(
    <I18nContext>
      <EuiErrorBoundary>
        <ConstateProvider devtools>
          <ReduxStoreProvider store={store}>
            <ApolloProvider client={libs.apolloClient}>
              <ApolloClientContext.Provider value={libs.apolloClient}>
                <EuiThemeProvider darkMode={libs.framework.darkMode}>
                  <PageRouter history={history} />
                </EuiThemeProvider>
              </ApolloClientContext.Provider>
            </ApolloProvider>
          </ReduxStoreProvider>
        </ConstateProvider>
      </EuiErrorBoundary>
    </I18nContext>
  );
}
