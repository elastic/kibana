/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules'; // eslint-disable-line no-unused-vars

import './vendor/jquery_ui_sortable.js';
import './vendor/jquery_ui_sortable.css';

import chrome from 'ui/chrome';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { getStore } from './store/store';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';
import { initTimepicker } from './timepicker';

import './style/main.less';

import template from './templates/index.html';
import { GISApp } from './components/gis_app';
import 'ui/vis/map/service_settings';

chrome.setRootTemplate(template);

async function init(store) {
  const root = document.getElementById('react-gis-root');
  ReactDOM.render(
    <Provider store={store}>
      <GISApp/>
    </Provider>,
    root);
}

new Promise(initTimepicker)
  .then(getStore)
  .then(store => init(store));