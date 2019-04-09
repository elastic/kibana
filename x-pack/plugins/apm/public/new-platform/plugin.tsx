/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { CoreSetup } from 'src/core/public';
import { Main } from '../components/app/Main';
import { history } from '../components/shared/Links/url_helpers';
import { LocationProvider } from '../context/LocationContext';
// @ts-ignore
import configureStore from '../store/config/configureStore';

export const REACT_APP_ROOT_ID = 'react-apm-root';

export class Plugin {
  public setup(core: CoreSetup) {
    const { i18n } = core;
    const store = configureStore();
    ReactDOM.render(
      <i18n.Context>
        <Provider store={store}>
          <Router history={history}>
            <LocationProvider history={history}>
              <Main />
            </LocationProvider>
          </Router>
        </Provider>
      </i18n.Context>,
      document.getElementById(REACT_APP_ROOT_ID)
    );
  }
}
