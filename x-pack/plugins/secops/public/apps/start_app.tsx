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
import { I18nProvider } from '@kbn/i18n/react';

import { ErrorToast } from '../components/error_toast';
import { AppFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';

export const startApp = async (libs: AppFrontendLibs) => {
  const history = createHashHistory();

  const store = createStore();

  libs.framework.render(
    <EuiErrorBoundary>
      <I18nProvider>
        <ReduxStoreProvider store={store}>
          <ApolloProvider client={libs.apolloClient}>
            <ThemeProvider
              theme={() => ({
                eui: libs.framework.darkMode ? euiDarkVars : euiLightVars,
                darkMode: libs.framework.darkMode,
              })}
            >
              <PageRouter history={history} />
            </ThemeProvider>
            <ErrorToast />
          </ApolloProvider>
        </ReduxStoreProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
};
