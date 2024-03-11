/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { PluginContext } from '../context/plugin_context';
import { routes } from '../routes';
import { ExploratoryViewPublicPluginsStart } from '../plugin';

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
  appMountParameters,
  plugins,
  usageCollection,
  isDev,
}: {
  core: CoreStart;
  appMountParameters: AppMountParameters;
  plugins: ExploratoryViewPublicPluginsStart;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.theme.getTheme().darkMode;

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.exploratoryView.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

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
            }}
          >
            <PluginContext.Provider
              value={{
                appMountParameters,
              }}
            >
              <Router history={history}>
                <EuiThemeProvider darkMode={isDarkMode}>
                  <i18nCore.Context>
                    <div
                      className={APP_WRAPPER_CLASS}
                      data-test-subj="exploratoryViewMainContainer"
                    >
                      <RedirectAppLinks
                        coreStart={{
                          application: core.application,
                        }}
                      >
                        <App />
                      </RedirectAppLinks>
                    </div>
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
    ReactDOM.unmountComponentAtNode(element);
  };
};
