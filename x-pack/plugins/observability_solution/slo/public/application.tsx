/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { ExperimentalFeatures } from '../common/config';
import { PluginContext } from './context/plugin_context';
import { usePluginContext } from './hooks/use_plugin_context';
import { getRoutes } from './routes/routes';
import { SloPublicPluginsStart } from './types';

function App() {
  const { isServerless } = usePluginContext();

  const routes = getRoutes(isServerless);

  return (
    <>
      <Routes>
        {Object.keys(routes).map((path) => {
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
  plugins,
  appMountParameters,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
  isServerless,
  observabilityRuleTypeRegistry,
  experimentalFeatures,
}: {
  core: CoreStart;
  plugins: SloPublicPluginsStart;
  appMountParameters: AppMountParameters;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
  experimentalFeatures: ExperimentalFeatures;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const isDarkMode = core.theme.getTheme().darkMode;

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  const PresentationContextProvider = plugins.presentationUtil?.ContextProvider ?? React.Fragment;

  const unregisterPrompts = plugins.observabilityAIAssistant?.service.setScreenContext({
    starterPrompts: [
      {
        title: i18n.translate('xpack.slo.starterPrompts.whatAreSlos.title', {
          defaultMessage: 'Getting started',
        }),
        prompt: i18n.translate('xpack.slo.starterPrompts.whatAreSlos.prompt', {
          defaultMessage: 'What are SLOs?',
        }),
        icon: 'bullseye',
      },
      {
        title: i18n.translate('xpack.slo.starterPrompts.canYouCreateAnSlo.title', {
          defaultMessage: 'Getting started',
        }),
        prompt: i18n.translate('xpack.slo.starterPrompts.canYouCreateAnSlo.prompt', {
          defaultMessage: 'Can you create an SLO?',
        }),
        icon: 'questionInCircle',
      },
    ],
  });

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <PresentationContextProvider>
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
                <PluginContext.Provider
                  value={{
                    isDev,
                    isServerless,
                    appMountParameters,
                    ObservabilityPageTemplate,
                    observabilityRuleTypeRegistry,
                    experimentalFeatures,
                  }}
                >
                  <Router history={history}>
                    <EuiThemeProvider darkMode={isDarkMode}>
                      <RedirectAppLinks
                        coreStart={core}
                        data-test-subj="observabilityMainContainer"
                      >
                        <PerformanceContextProvider>
                          <QueryClientProvider client={queryClient}>
                            <App />
                          </QueryClientProvider>
                        </PerformanceContextProvider>
                      </RedirectAppLinks>
                    </EuiThemeProvider>
                  </Router>
                </PluginContext.Provider>
              </KibanaContextProvider>
            </CloudProvider>
          </KibanaThemeProvider>
        </ApplicationUsageTrackingProvider>
      </PresentationContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    // This needs to be present to fix https://github.com/elastic/kibana/issues/155704
    // as the Overview page renders the UX Section component. That component renders a Lens embeddable
    // via the ExploratoryView app, which uses search sessions. Therefore on unmounting we need to clear
    // these sessions.
    plugins.data.search.session.clear();
    unregisterPrompts?.();
    ReactDOM.unmountComponentAtNode(element);
  };
};
