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
import configureStore from './store/config/configureStore';
import GlobalProgress from './components/app/Main/GlobalProgress';
import LicenseChecker from './components/app/Main/LicenseChecker';
import { GlobalHelpExtension } from './components/app/GlobalHelpExtension';

import { history } from './components/shared/Links/url_helpers';

import { I18nContext } from 'ui/i18n';

// render APM feedback link in global help menu
chrome.helpExtension.set(domElement => {
  ReactDOM.render(<GlobalHelpExtension />, domElement);
  return () => {
    ReactDOM.unmountComponentAtNode(domElement);
  };
});
const REACT_APP_ROOT_ID = 'react-apm-root';

chrome.setRootTemplate(template);
const store = configureStore();
const checkForRoot = resolve => {
  const ready = !!document.getElementById(REACT_APP_ROOT_ID);
  if (ready) {
    resolve();
  } else {
    setTimeout(() => checkForRoot(resolve), 10);
  }
};
const waitForRoot = new Promise(resolve => checkForRoot(resolve));

waitForRoot.then(() => {
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
    document.getElementById(REACT_APP_ROOT_ID)
  );
});
