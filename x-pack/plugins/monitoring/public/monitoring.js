/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { MonitoringApp } from './app';
import template from './monitoring.html';
import { buildStore } from './store/store';

const REACT_APP_ROOT_ID = 'reactMonitoringApp';
const uiSettings = chrome.getUiSettingsClient();

// default timepicker default to the last hour
uiSettings.overrideLocalDefault('timepicker:timeDefaults', JSON.stringify({
  from: 'now-1h',
  to: 'now',
  mode: 'quick'
}));

// default autorefresh to active and refreshing every 10 seconds
uiSettings.overrideLocalDefault('timepicker:refreshIntervalDefaults', JSON.stringify({
  display: '10 seconds',
  pause: false,
  value: 10000
}));

function renderReact() {
  render(
    <I18nContext>
      <HashRouter>
        <Provider store={buildStore()}>
          <MonitoringApp />
        </Provider>
      </HashRouter>
    </I18nContext>,
    document.getElementById(REACT_APP_ROOT_ID)
  );
}

chrome.setRootTemplate(template);
const checkForRoot = (resolve) => {
  const ready = !!document.getElementById(REACT_APP_ROOT_ID);
  if (ready) {
    resolve();
  } else {
    setTimeout(() => checkForRoot(resolve), 10);
  }
};
const waitForRoot = new Promise(resolve => checkForRoot(resolve));
waitForRoot.then(renderReact);
