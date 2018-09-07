/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject, of } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { ThemeProvider } from 'styled-components';

// TODO use theme provided from parentApp when kibana supports it
import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import '@elastic/eui/dist/eui_theme_light.css';
import { InfraFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';

export async function startApp(libs: InfraFrontendLibs) {
  const history = createHashHistory();

  const libs$ = new BehaviorSubject(libs);
  const store = createStore({
    apolloClient: libs$.pipe(pluck('apolloClient')),
    history: of(history),
    observableApi: libs$.pipe(pluck('observableApi')),
  });

  libs.framework.render(
    <ReduxStoreProvider store={store}>
      <ApolloProvider client={libs.apolloClient}>
        <ThemeProvider theme={{ eui: euiVars }}>
          <PageRouter history={history} />
        </ThemeProvider>
      </ApolloProvider>
    </ReduxStoreProvider>
  );
}
