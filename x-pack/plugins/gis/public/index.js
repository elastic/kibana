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
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'ui/agg_types';

import chrome from 'ui/chrome';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { getStore } from './store/store';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';
import { initGisApp } from './init_gis_app';

import "mapbox-gl/dist/mapbox-gl.css";

import gisAppTemplate from './gis_app.html';
import { GISApp } from './components/gis_app';
import 'ui/vis/map/service_settings';

chrome.setRootTemplate(gisAppTemplate);

async function init(store) {
  const root = document.getElementById('react-gis-root');
  ReactDOM.render(
    <Provider store={store}>
      <GISApp/>
    </Provider>,
    root);
}

new Promise(initGisApp)
  .then(getStore)
  .then(store => init(store));
