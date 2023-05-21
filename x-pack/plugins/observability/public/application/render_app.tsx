/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { HasDataContextProvider } from '../context/has_data_context/has_data_context';
import { PluginContext } from '../context/plugin_context/plugin_context';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { HideableReactQueryDevTools } from './hideable_react_query_dev_tools';
import { LoadingObservability } from '../components/loading_observability';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';

const App = lazy(() => import('./app'));

export const renderApp = ({
  core,
  config,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  ReactDOM.render(
    <EuiErrorBoundary>
      <ApplicationUsageTrackingProvider>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              storage: new Storage(localStorage),
              isDev,
              kibanaVersion,
            }}
          >
            <PluginContext.Provider
              value={{
                config,
                appMountParameters,
                observabilityRuleTypeRegistry,
                ObservabilityPageTemplate,
              }}
            >
              <Router history={history}>
                <EuiThemeProvider darkMode={isDarkMode}>
                  <i18nCore.Context>
                    <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
                      <QueryClientProvider client={queryClient}>
                        <HasDataContextProvider>
                          <Suspense fallback={<LoadingObservability />}>
                            <App />
                          </Suspense>
                        </HasDataContextProvider>
                        <HideableReactQueryDevTools />
                      </QueryClientProvider>
                    </RedirectAppLinks>
                  </i18nCore.Context>
                </EuiThemeProvider>
              </Router>
            </PluginContext.Provider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </ApplicationUsageTrackingProvider>
    </EuiErrorBoundary>,
    element
  );
  return () => {
    // This needs to be present to fix https://github.com/elastic/kibana/issues/155704
    // as the Overview page renders the UX Section component. That component renders a Lens embeddable
    // via the ExploratoryView app, which uses search sessions. Therefore on unmounting we need to clear
    // these sessions.
    plugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
