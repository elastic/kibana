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
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';
import { initTimepicker } from './timepicker';

import './style/main.less';
import '../../../node_modules/openlayers/dist/ol.css';

import template from './templates/index.html';
import { GISApp } from './components/gis_app';

import 'ui/vis/map/service_settings';

chrome.setRootTemplate(template);
initTimepicker(init);


let kbnCoreAPI = null;

uiModules
  .get('kibana')
  .run((Private, $injector) => {
    const serviceSettings = $injector.get('serviceSettings');
    const mapConfig = $injector.get('mapConfig');
    kbnCoreAPI = {
      serviceSettings: serviceSettings,
      mapConfig: mapConfig
    };
  });


async function init() {
  const handle = setInterval(() => {
    if (kbnCoreAPI !== null) {
      clearInterval(handle);
      const root = document.getElementById('react-gis-root');
      ReactDOM.render(<GISApp kbnCoreAPI={kbnCoreAPI}/>, root);
    }
  }, 10);
}
