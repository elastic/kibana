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
import { I18nContext } from 'ui/i18n';

import { ErrorToast } from '../components/error_toast';
import { KibanaConfigContext } from '../components/formatted_date';
import { AppFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { store } from '../store';

export const startApp = async (libs: AppFrontendLibs) => {
  const history = createHashHistory();

  libs.framework.render(
    <EuiErrorBoundary>
      <I18nContext>
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
            <ErrorToast />
          </ApolloProvider>
        </ReduxStoreProvider>
      </I18nContext>
    </EuiErrorBoundary>
  );
};
