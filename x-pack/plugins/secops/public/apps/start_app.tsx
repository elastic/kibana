/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { ThemeProvider } from 'styled-components';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { AppFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';

export async function startApp(libs: AppFrontendLibs) {
  const history = createHashHistory();

  libs.framework.render(
    <EuiErrorBoundary>
      <ApolloProvider client={libs.apolloClient}>
        <ThemeProvider theme={{ eui: euiVars }}>
          <PageRouter history={history} />
        </ThemeProvider>
      </ApolloProvider>
    </EuiErrorBoundary>
  );
}
