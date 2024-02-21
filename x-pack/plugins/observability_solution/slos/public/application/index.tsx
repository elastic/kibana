/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
// import { PluginContext } from '@kbn/exploratory-view-plugin/public/context/plugin_context';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PluginContext } from '../context/plugin_context';

import { SlosPluginStartDeps } from './types';
import { routes } from '../routes/routes';

// import { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';

function App() {
  return (
    <>
      <Routes>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            console.log('!!wrapper');
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Routes>
    </>
  );
}

export const renderApp = ({ core, plugins, appMountParameters, ObservabilityPageTemplate }) => {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  const queryClient = new QueryClient();

  console.log('!!renderApp');
  ReactDOM.render(
    <EuiErrorBoundary>
      <KibanaThemeProvider {...{ theme: { theme$ } }}>
        <CloudProvider>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
            }}
          >
            <PluginContext.Provider value={{ appMountParameters, ObservabilityPageTemplate }}>
              <Router history={history}>
                <i18nCore.Context>
                  <RedirectAppLinks coreStart={core} data-test-subj="observabilityMainContainer">
                    <QueryClientProvider client={queryClient}>
                      <App />
                    </QueryClientProvider>
                  </RedirectAppLinks>
                </i18nCore.Context>
              </Router>
            </PluginContext.Provider>
          </KibanaContextProvider>
        </CloudProvider>
      </KibanaThemeProvider>
    </EuiErrorBoundary>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
