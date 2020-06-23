/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHashHistory } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { EuiThemeProvider } from '../../../../legacy/common/eui_styled_components';
import { PluginContext } from '../context/plugin_context';
import { useUrlParams } from '../hooks/use_url_params';
import { routes } from '../routes';

const App = () => {
  return (
    <>
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const route = routes[path];
          return (
            <Route
              key={path}
              path={path}
              exact={true}
              component={() => {
                const { query, path: pathParams } = useUrlParams<typeof path>(route);
                return route.handler({ query, path: pathParams });
              }}
            />
          );
        })}
        {/* <Route path="/" exact={true} component={Home} />
        <Route path="/overview" exact={true} component={Overview} /> */}
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
