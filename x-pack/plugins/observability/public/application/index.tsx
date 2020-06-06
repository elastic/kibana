/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { createHashHistory } from 'history';
import { EuiThemeProvider } from '../../../../legacy/common/eui_styled_components';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { Home } from '../pages/home';
import { Overview } from '../pages/overview';
import { PluginContext } from '../context/plugin_context';

const App = () => {
  return (
    <>
      <Switch>
        <Route path="/" exact={true} component={Home} />
        <Route path="/overview" exact={true} component={Overview} />
      </Switch>
    </>
  );
};

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');
  const history = createHashHistory();
  ReactDOM.render(
    <PluginContext.Provider value={{ core }}>
      <Router history={history}>
        <EuiThemeProvider darkMode={isDarkMode}>
          <i18nCore.Context>
            <App />
          </i18nCore.Context>
        </EuiThemeProvider>
      </Router>
    </PluginContext.Provider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
