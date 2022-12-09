/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from 'react-router-dom';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '../components/shared/page_template/lazy_page_template';
import { HasDataContextProvider } from '../context/has_data_context';
import { PluginContext } from '../context/plugin_context';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { getRoutes } from '../routes';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';

export const renderApp = ({
  core,
  config,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
}) => {
  const { element, theme$ } = appMountParameters;
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

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  function AppRoute() {
    const router = createBrowserRouter(
      createRoutesFromElements(
        <Route element={<HasDataContextProvider />}>
          <>
            {Object.entries(getRoutes(core.http)).map(([key, detail]) => {
              const path = key;
              const { paramType, ...routeProps } = detail;
              return <Route key={path} path={path} {...routeProps} />;
            })}
          </>
        </Route>
      )
    );

    return (
      <ApplicationUsageTrackingProvider>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{ ...core, ...plugins, storage: new Storage(localStorage), isDev }}
          >
            <PluginContext.Provider
              value={{
                config,
                appMountParameters,
                observabilityRuleTypeRegistry,
                ObservabilityPageTemplate,
              }}
            >
              <EuiThemeProvider darkMode={isDarkMode}>
                <i18nCore.Context>
                  <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
                    <RouterProvider router={router} />
                  </RedirectAppLinks>
                </i18nCore.Context>
              </EuiThemeProvider>
            </PluginContext.Provider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </ApplicationUsageTrackingProvider>
    );
  }

  ReactDOM.render(<AppRoute />, element);
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
