/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { Main } from '../components/app/Main';
import { history } from '../components/shared/Links/url_helpers';
import { LocationProvider } from '../context/LocationContext';
// @ts-ignore
import configureStore from '../store/config/configureStore';

export const REACT_APP_ROOT_ID = 'react-apm-root';

export class Plugin {
  public setup() {
    const store = configureStore();
    ReactDOM.render(
      <I18nContext>
        <Provider store={store}>
          <Router history={history}>
            <LocationProvider history={history}>
              <Main />
            </LocationProvider>
          </Router>
        </Provider>
      </I18nContext>,
      document.getElementById(REACT_APP_ROOT_ID)
    );
  }
}
