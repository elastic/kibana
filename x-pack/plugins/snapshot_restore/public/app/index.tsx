/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useReducer } from 'react';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';

import { AppCore, AppPlugins } from '../shim';
import { App } from './app';
import { AppStateInterface, AppStateProvider } from './services/app_context';

export { BASE_PATH as CLIENT_BASE_PATH } from './constants';

// Placeholder reducer in case we need it for any app state data
const appStateReducer = (state: any, action: any) => {
  switch (action.type) {
    default:
      return state;
  }
};

const ReactApp = ({ appState }: { appState: AppStateInterface }) => {
  const {
    i18n: { Context: I18nContext },
  } = appState.core;
  return (
    <I18nContext>
      <HashRouter>
        <AppStateProvider value={useReducer(appStateReducer, appState)}>
          <App />
        </AppStateProvider>
      </HashRouter>
    </I18nContext>
  );
};

export const renderReact = async (
  elem: Element,
  core: AppCore,
  plugins: AppPlugins
): Promise<void> => {
  render(
    <ReactApp
      appState={{
        core,
        plugins,
      }}
    />,
    elem
  );
};
