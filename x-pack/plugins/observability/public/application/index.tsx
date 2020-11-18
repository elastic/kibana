/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../xpack_legacy/common';
import { PluginContext } from '../context/plugin_context';
import { usePluginContext } from '../hooks/use_plugin_context';
import { useRouteParams } from '../hooks/use_route_params';
import { ObservabilityPluginSetupDeps } from '../plugin';
import { Breadcrumbs, routes } from '../routes';

const observabilityLabelBreadcrumb = {
  text: i18n.translate('xpack.observability.observability.breadcrumb.', {
    defaultMessage: 'Observability',
  }),
};

function getTitleFromBreadCrumbs(breadcrumbs: Breadcrumbs) {
  return breadcrumbs.map(({ text }) => text).reverse();
}

function App() {
  return (
    <>
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const route = routes[path];
          const Wrapper = () => {
            const { core } = usePluginContext();

            // eslint-disable-next-line react-hooks/exhaustive-deps
            const breadcrumb = [observabilityLabelBreadcrumb, ...route.breadcrumb];
            useEffect(() => {
              core.chrome.setBreadcrumbs(breadcrumb);
              core.chrome.docTitle.change(getTitleFromBreadCrumbs(breadcrumb));
            }, [core, breadcrumb]);

            const { query, path: pathParams } = useRouteParams(route.params);
            return route.handler({ query, path: pathParams });
          };
          return <Route key={path} path={path} exact={true} component={Wrapper} />;
        })}
      </Switch>
    </>
  );
}

export const renderApp = (
  core: CoreStart,
  plugins: ObservabilityPluginSetupDeps,
  appMountParameters: AppMountParameters
) => {
  const { element, history } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observability.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <PluginContext.Provider value={{ appMountParameters, core, plugins }}>
        <Router history={history}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <i18nCore.Context>
              <RedirectAppLinks application={core.application}>
                <App />
              </RedirectAppLinks>
            </i18nCore.Context>
          </EuiThemeProvider>
        </Router>
      </PluginContext.Provider>
    </KibanaContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
