/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { CoreSetup } from 'src/core/public';
import { Main } from '../components/app/Main';
import { history } from '../utils/history';
import { LocationProvider } from '../context/LocationContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';

export const REACT_APP_ROOT_ID = 'react-apm-root';

export class Plugin {
  public setup(core: CoreSetup) {
    const { i18n } = core;
    ReactDOM.render(
      <i18n.Context>
        <Router history={history}>
          <LocationProvider history={history}>
            <UrlParamsProvider>
              <Main />
            </UrlParamsProvider>
          </LocationProvider>
        </Router>
      </i18n.Context>,
      document.getElementById(REACT_APP_ROOT_ID)
    );
  }
}
