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
import * as dark from '@elastic/eui/dist/eui_theme_k6_dark.json';
import { I18nProvider } from '@kbn/i18n/react';

// @ts-ignore
import { applyTheme } from 'ui/theme';
applyTheme('dark');

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
            <ThemeProvider theme={{ eui: dark }}>
              <PageRouter history={history} />
            </ThemeProvider>
          </ApolloProvider>
        </ReduxStoreProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
};
