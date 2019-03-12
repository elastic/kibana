/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';

import { AppCore, AppPlugins } from '../shim';
import { App } from './app';
import { AppContext, AppContextInterface } from './services/app_context';

export { BASE_PATH as CLIENT_BASE_PATH } from './constants';

export const renderReact = async (
  elem: Element,
  core: AppCore,
  plugins: AppPlugins
): Promise<void> => {
  const {
    i18n: { Context: I18nContext },
  } = core;

  const appContext: AppContextInterface = {
    core,
    plugins,
  };

  render(
    <I18nContext>
      <HashRouter>
        <AppContext.Provider value={appContext}>
          <App />
        </AppContext.Provider>
      </HashRouter>
    </I18nContext>,
    elem
  );
};
