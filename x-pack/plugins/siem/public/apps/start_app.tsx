/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { EuiErrorBoundary } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { I18nContext } from 'ui/i18n';

import { ErrorToastDispatcher } from '../components/error_toast_dispatcher';
import { KibanaConfigContext } from '../lib/adapters/framework/kibana_framework_adapter';
import { AppFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';
import { GlobalToaster, ManageGlobalToaster } from '../components/toasters';

export const startApp = async (libs: AppFrontendLibs) => {
  const history = createHashHistory();

  const libs$ = new BehaviorSubject(libs);

  const store = createStore(undefined, libs$.pipe(pluck('apolloClient')));

  libs.framework.render(
    <EuiErrorBoundary>
      <I18nContext>
        <ManageGlobalToaster>
          <ReduxStoreProvider store={store}>
            <ApolloProvider client={libs.apolloClient}>
              <ThemeProvider
                theme={() => ({
                  eui: libs.framework.darkMode ? euiDarkVars : euiLightVars,
                  darkMode: libs.framework.darkMode,
                })}
              >
                <KibanaConfigContext.Provider value={libs.framework}>
                  <PageRouter history={history} />
                </KibanaConfigContext.Provider>
              </ThemeProvider>
              <ErrorToastDispatcher />
              <GlobalToaster />
            </ApolloProvider>
          </ReduxStoreProvider>
        </ManageGlobalToaster>
      </I18nContext>
    </EuiErrorBoundary>
  );
};
