/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '../../../../../src/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../src/plugins/kibana_react/public';
import { PluginContext } from '../context/plugin_context';
import { usePluginContext } from '../hooks/use_plugin_context';
import { useRouteParams } from '../hooks/use_route_params';
import { ObservabilityPublicPluginsStart } from '../plugin';
import type { LazyObservabilityPageTemplateProps } from '../components/shared/page_template/lazy_page_template';
import { HasDataContextProvider } from '../context/has_data_context';
import { Breadcrumbs, routes } from '../routes';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { ConfigSchema } from '..';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';

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

            useEffect(() => {
              const href = core.http.basePath.prepend('/app/observability');
              const breadcrumbs = [
                {
                  href,
                  text: i18n.translate('xpack.observability.observability.breadcrumb.', {
                    defaultMessage: 'Observability',
                  }),
                  onClick: (event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    core.application.navigateToUrl(href);
                  },
                },
                ...route.breadcrumb,
              ];
              core.chrome.setBreadcrumbs(breadcrumbs);
              core.chrome.docTitle.change(getTitleFromBreadCrumbs(breadcrumbs));
            }, [core]);

            const params = useRouteParams(path);
            return route.handler(params);
          };
          return <Route key={path} path={path} exact={true} component={Wrapper} />;
        })}
      </Switch>
    </>
  );
}

export const renderApp = ({
  config,
  core,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
}: {
  config: ConfigSchema;
  core: CoreStart;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}) => {
  const { element, history } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observability.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...plugins, storage: new Storage(localStorage) }}>
      <PluginContext.Provider
        value={{
          appMountParameters,
          config,
          core,
          plugins,
          observabilityRuleTypeRegistry,
          ObservabilityPageTemplate,
        }}
      >
        <Router history={history}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <i18nCore.Context>
              <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
                <HasDataContextProvider>
                  <App />
                </HasDataContextProvider>
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
