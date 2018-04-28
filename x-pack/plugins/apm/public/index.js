/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules'; // eslint-disable-line no-unused-vars
import chrome from 'ui/chrome';
import React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import ReactDOM from 'react-dom';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';
import './style/global_overrides.css';

import template from './templates/index.html';
import Main from './components/app/Main';
import Breadcrumbs from './components/app/Main/Breadcrumbs';

import { initTimepicker } from './utils/timepicker';
import configureStore from './store/config/configureStore';

import { history } from './utils/url';

chrome.setRootTemplate(template);

const store = configureStore();

initTimepicker(history, store.dispatch, () => {
  ReactDOM.render(
    <Router history={history}>
      <Breadcrumbs />
    </Router>,
    document.getElementById('react-apm-breadcrumbs')
  );

  ReactDOM.render(
    <Provider store={store}>
      <Router history={history}>
        <Main />
      </Router>
    </Provider>,
    document.getElementById('react-apm-root')
  );
});
