/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ObservabilityAIAssistantProvider } from '@kbn/observability-ai-assistant-plugin/public';
import { HasDataContextProvider } from '../context/has_data_context/has_data_context';
import { PluginContext } from '../context/plugin_context/plugin_context';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { routes } from '../routes/routes';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { HideableReactQueryDevTools } from './hideable_react_query_dev_tools';

function App() {
  return (
    <>
      <Routes>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Routes>
    </>
  );
}

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
  isServerless,
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
  isServerless?: boolean;
}) => {
  const { element, history, theme$ } = appMountParameters;
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

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  ReactDOM.render(
    <EuiErrorBoundary>
      <ApplicationUsageTrackingProvider>
        <KibanaThemeProvider {...{ theme: { theme$ } }}>
          <CloudProvider>
            <KibanaContextProvider
              services={{
                ...core,
                ...plugins,
                storage: new Storage(localStorage),
                isDev,
                kibanaVersion,
                isServerless,
              }}
            >
              <ObservabilityAIAssistantProvider value={plugins.observabilityAIAssistant}>
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
                        <RedirectAppLinks
                          coreStart={core}
                          data-test-subj="observabilityMainContainer"
                        >
                          <QueryClientProvider client={queryClient}>
                            <HasDataContextProvider>
                              <App />
                            </HasDataContextProvider>
                            <HideableReactQueryDevTools />
                          </QueryClientProvider>
                        </RedirectAppLinks>
                      </i18nCore.Context>
                    </EuiThemeProvider>
                  </Router>
                </PluginContext.Provider>
              </ObservabilityAIAssistantProvider>
            </KibanaContextProvider>
          </CloudProvider>
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
