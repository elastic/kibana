/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'src/core/public';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
import { HashRouter, Switch } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { routes } from './routes';
import { PLUGIN_ID } from '../common/constants';

const REACT_APP_ROOT_ID = `react-${PLUGIN_ID}-root`;
const template = `<div id="${REACT_APP_ROOT_ID}" class="integrationsManagerReactRoot"></div>`;

function App() {
  return (
    <EuiPage style={{ flexWrap: 'wrap' }}>
      <Switch>{routes}</Switch>
    </EuiPage>
  );
}

class Plugin {
  public start(core: CoreStart) {
    const { i18n } = core;
    ReactDOM.render(
      <i18n.Context>
        <HashRouter>
          <App />
        </HashRouter>
      </i18n.Context>,
      document.getElementById(REACT_APP_ROOT_ID)
    );
  }
}

// @ts-ignore
chrome.setRootTemplate(template);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(REACT_APP_ROOT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};

checkForRoot().then(() => {
  const core = {
    i18n: {
      Context: I18nContext,
    },
  } as CoreStart;
  new Plugin().start(core);
});
