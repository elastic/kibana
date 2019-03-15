/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import 'react-vis/dist/style.css';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import 'uiExports/autocompleteProviders';
import { GlobalHelpExtension } from './components/app/GlobalHelpExtension';
import { Main } from './components/app/Main';
import { GlobalProgress } from './components/app/Main/GlobalProgress';
import { history } from './components/shared/Links/url_helpers';
// @ts-ignore
import configureStore from './store/config/configureStore';
import './style/global_overrides.css';
import template from './templates/index.html';

// render APM feedback link in global help menu
chrome.helpExtension.set(domElement => {
  ReactDOM.render(<GlobalHelpExtension />, domElement);
  return () => {
    ReactDOM.unmountComponentAtNode(domElement);
  };
});
const REACT_APP_ROOT_ID = 'react-apm-root';

type PromiseResolver = (value?: {} | PromiseLike<{}> | undefined) => void;

// @ts-ignore
chrome.setRootTemplate(template);
chrome.disableAutoAngularUrlEncodingFix();
const store = configureStore();
const checkForRoot = (resolve: PromiseResolver) => {
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
          <Router history={history}>
            <Main />
          </Router>
        </Fragment>
      </Provider>
    </I18nContext>,
    document.getElementById(REACT_APP_ROOT_ID)
  );
});
