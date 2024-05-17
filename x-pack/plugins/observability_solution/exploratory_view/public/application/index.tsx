/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS, AppMountParameters, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { PluginContext } from '../context/plugin_context';
import { ExploratoryViewPublicPluginsStart } from '../plugin';
import { routes } from '../routes';

export type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

function App(props: { startServices: StartServices }) {
  return (
    <>
      <Routes>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler({ startServices: props.startServices });
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
  const { element, history } = appMountParameters;
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
    <KibanaRenderContextProvider {...core}>
      <ApplicationUsageTrackingProvider>
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
                <div className={APP_WRAPPER_CLASS} data-test-subj="exploratoryViewMainContainer">
                  <RedirectAppLinks
                    coreStart={{
                      application: core.application,
                    }}
                  >
                    <App startServices={core} />
                  </RedirectAppLinks>
                </div>
              </EuiThemeProvider>
            </Router>
          </PluginContext.Provider>
        </KibanaContextProvider>
      </ApplicationUsageTrackingProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
