/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import { render } from 'react-dom';
import { AppContext } from './services/app_context';

// import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import { App } from './app';
// import { srStore } from './store';

export { BASE_PATH as CLIENT_BASE_PATH } from './constants';

export const renderReact = async (elem: Element | null, core: object, plugins: object): Promise<void> => {
  const {
    i18n: { Context: I18nContext },
  } = core;

  render(
    <I18nContext>
      {/*<Provider store={srStore}>*/}
      <HashRouter>
        <AppContext.Provider value={{ core, plugins }}>
          <App />
        </AppContext.Provider>
      </HashRouter>
    </I18nContext>,
    elem
  );
};
