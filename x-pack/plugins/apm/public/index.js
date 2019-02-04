/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules'; // eslint-disable-line no-unused-vars
import chrome from 'ui/chrome';
import React, { Fragment } from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import ReactDOM from 'react-dom';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'uiExports/autocompleteProviders';
import 'react-vis/dist/style.css';
import './style/global_overrides.css';

import template from './templates/index.html';
import Main from './components/app/Main';

import { initTimepicker } from './utils/timepicker';
import configureStore from './store/config/configureStore';
import GlobalProgress from './components/app/Main/GlobalProgress';
import LicenseChecker from './components/app/Main/LicenseChecker';

import { history } from './components/shared/Links/url_helpers';

import { I18nContext } from 'ui/i18n';

chrome.setRootTemplate(template);
const store = configureStore();

initTimepicker(history, store.dispatch).then(() => {
  ReactDOM.render(
    <I18nContext>
      <Provider store={store}>
        <Fragment>
          <GlobalProgress />
          <LicenseChecker />
          <Router history={history}>
            <Main />
          </Router>
        </Fragment>
      </Provider>
    </I18nContext>,
    document.getElementById('react-apm-root')
  );
});
