/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { createHashHistory } from 'history';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { ApolloProvider } from 'react-apollo';
import { PageRouter } from '../routes';

// TODO use theme provided from parentApp when kibana supports it
import '@elastic/eui/dist/eui_theme_light.css';
import { LibsContext } from '../containers/libs';
import { InfraFrontendLibs } from '../lib/lib';

export async function startApp(libs: InfraFrontendLibs) {
  const history = createHashHistory();

  libs.framework.render(
    <LibsContext.Provider value={libs}>
      <ApolloProvider client={libs.apolloClient}>
        <ThemeProvider theme={{ eui: euiVars }}>
          <PageRouter history={history} />
        </ThemeProvider>
      </ApolloProvider>
    </LibsContext.Provider>
  );
}
