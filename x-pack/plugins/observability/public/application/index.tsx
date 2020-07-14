/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHashHistory } from 'history';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { EuiThemeProvider } from '../../../../legacy/common/eui_styled_components';
import { PluginContext } from '../context/plugin_context';
import { useUrlParams } from '../hooks/use_url_params';
import { routes } from '../routes';
import { usePluginContext } from '../hooks/use_plugin_context';

const App = () => {
  return (
    <>
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const route = routes[path];
          const Wrapper = () => {
            const { core } = usePluginContext();
            useEffect(() => {
              core.chrome.setBreadcrumbs([
                {
                  text: i18n.translate('xpack.observability.observability.breadcrumb.', {
                    defaultMessage: 'Observability',
                  }),
                },
                ...route.breadcrumb,
              ]);
            }, [core]);

            const { query, path: pathParams } = useUrlParams(route.params);
            return route.handler({ query, path: pathParams });
          };
          return <Route key={path} path={path} exact={true} component={Wrapper} />;
        })}
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
            <RedirectAppLinks application={core.application}>
              <App />
            </RedirectAppLinks>
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
