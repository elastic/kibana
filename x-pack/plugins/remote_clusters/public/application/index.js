/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';

import { KibanaThemeProvider, useExecutionContext } from '../shared_imports';
import { App } from './app';
import { remoteClustersStore } from './store';
import { AppContextProvider } from './app_context';

import './_hacks.scss';

const AppWithExecutionContext = ({ history, executionContext }) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'remoteClusters',
  });

  return <App history={history} />;
};

export const renderApp = (elem, I18nContext, appDependencies, history, theme$) => {
  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <Provider store={remoteClustersStore}>
          <AppContextProvider context={appDependencies}>
            <AppWithExecutionContext
              history={history}
              executionContext={appDependencies.executionContext}
            />
          </AppContextProvider>
        </Provider>
      </KibanaThemeProvider>
    </I18nContext>,
    elem
  );
  return () => unmountComponentAtNode(elem);
};
