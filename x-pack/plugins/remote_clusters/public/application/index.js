/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';

import { App } from './app';
import { remoteClustersStore } from './store';
import { AppContextProvider } from './app_context';

import './_hacks.scss';

export const renderApp = (elem, I18nContext, appDependencies, history) => {
  render(
    <I18nContext>
      <Provider store={remoteClustersStore}>
        <AppContextProvider context={appDependencies}>
          <App history={history} />
        </AppContextProvider>
      </Provider>
    </I18nContext>,
    elem
  );
  return () => unmountComponentAtNode(elem);
};
