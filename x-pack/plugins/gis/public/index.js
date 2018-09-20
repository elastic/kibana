/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

import './vendor/jquery_ui_sortable.js';
import './vendor/jquery_ui_sortable.css';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/search';

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
initTimepicker(init);

async function init() {
  const root = document.getElementById('react-gis-root');
  getStore().then(store => ReactDOM.render(
    <Provider store={store}>
      <GISApp/>
    </Provider>,
    root));
}
