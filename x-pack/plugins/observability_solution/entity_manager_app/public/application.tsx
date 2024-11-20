/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntityClient } from '@kbn/entityManager-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { PluginContext } from './context/plugin_context';
import { EntityManagerPluginStart } from './types';
import { EntityManagerOverviewPage } from './pages/overview';

export function renderApp({
  core,
  plugins,
  appMountParameters,
  ObservabilityPageTemplate,
  isDev,
  kibanaVersion,
  isServerless,
  entityClient,
}: {
  core: CoreStart;
  plugins: EntityManagerPluginStart;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
  entityClient: EntityClient;
}) {
  const { element, history, theme$ } = appMountParameters;
  const isDarkMode = core.theme.getTheme().darkMode;

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  const PresentationContextProvider = React.Fragment;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <PresentationContextProvider>
        <KibanaThemeProvider {...{ theme: { theme$ } }}>
          <CloudProvider>
            <KibanaContextProvider
              services={{
                ...core,
                ...plugins,
                storage: new Storage(localStorage),
                entityClient: new EntityClient(core),
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
                  entityClient,
                }}
              >
                <Router history={history}>
                  <EuiThemeProvider darkMode={isDarkMode}>
                    <RedirectAppLinks coreStart={core} data-test-subj="observabilityMainContainer">
                      <PerformanceContextProvider>
                        <QueryClientProvider client={queryClient}>
                          <EntityManagerOverviewPage />
                        </QueryClientProvider>
                      </PerformanceContextProvider>
                    </RedirectAppLinks>
                  </EuiThemeProvider>
                </Router>
              </PluginContext.Provider>
            </KibanaContextProvider>
          </CloudProvider>
        </KibanaThemeProvider>
      </PresentationContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
