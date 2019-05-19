/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreSetup } from 'src/core/public';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { EuiPage, EuiTitle, EuiSpacer } from '@elastic/eui';
import { routes } from './routes';

const REACT_APP_ROOT_ID = 'react-integrations_manager-root';
const template = `<div id="${REACT_APP_ROOT_ID}" class="integrationsManagerReactRoot"></div>`;

function App() {
  return (
    <EuiPage style={{ flexWrap: 'wrap' }}>
      <div style={{ width: '100%' }}>
        <EuiTitle>
          <h1>Elastic Integrations Manager</h1>
        </EuiTitle>
        <EuiSpacer />
      </div>
      <Switch>
        {routes.map((route, i) => (
          <Route key={i} {...route} />
        ))}
      </Switch>
    </EuiPage>
  );
}

class Plugin {
  public setup(core: CoreSetup) {
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
  } as CoreSetup;
  new Plugin().setup(core);
});
