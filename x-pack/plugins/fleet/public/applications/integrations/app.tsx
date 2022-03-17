/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { AppMountParameters } from 'kibana/public';
import { EuiErrorBoundary } from '@elastic/eui';
import type { History } from 'history';
import { Router, Redirect, Route, Switch } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';

import { ConfigContext, FleetStatusProvider, KibanaVersionContext } from '../../hooks';

import type { FleetConfigType, FleetStartServices } from '../../plugin';

import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import { Chat } from '../../../../cloud/public';

import { KibanaThemeProvider } from '../../../../../../src/plugins/kibana_react/public';

import { AgentPolicyContextProvider } from './hooks';
import { INTEGRATIONS_ROUTING_PATHS, pagePathGetters } from './constants';

import type { UIExtensionsStorage } from './types';

import { EPMApp } from './sections/epm';
import { PackageInstallProvider, UIExtensionsContext } from './hooks';
import { IntegrationsHeader } from './components/header';

const EmptyContext = () => <></>;

/**
 * Fleet Application context all the way down to the Router, but with no permissions or setup checks
 * and no routes defined
 */
export const IntegrationsAppContext: React.FC<{
  basepath: string;
  startServices: FleetStartServices;
  config: FleetConfigType;
  history: AppMountParameters['history'];
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
  /** For testing purposes only */
  routerHistory?: History<any>; // TODO remove
}> = memo(
  ({
    children,
    startServices,
    config,
    history,
    kibanaVersion,
    extensions,
    setHeaderActionMenu,
    theme$,
  }) => {
    const isDarkMode = useObservable<boolean>(startServices.uiSettings.get$('theme:darkMode'));
    const CloudContext = startServices.cloud?.CloudContextProvider || EmptyContext;

    return (
      <RedirectAppLinks application={startServices.application}>
        <startServices.i18n.Context>
          <KibanaContextProvider services={{ ...startServices }}>
            <EuiErrorBoundary>
              <ConfigContext.Provider value={config}>
                <KibanaVersionContext.Provider value={kibanaVersion}>
                  <KibanaThemeProvider theme$={theme$}>
                    <EuiThemeProvider darkMode={isDarkMode}>
                      <UIExtensionsContext.Provider value={extensions}>
                        <FleetStatusProvider>
                          <startServices.customIntegrations.ContextProvider>
                            <CloudContext>
                              <Router history={history}>
                                <AgentPolicyContextProvider>
                                  <PackageInstallProvider
                                    notifications={startServices.notifications}
                                    theme$={theme$}
                                  >
                                    <IntegrationsHeader {...{ setHeaderActionMenu, theme$ }} />
                                    {children}
                                    <Chat />
                                  </PackageInstallProvider>
                                </AgentPolicyContextProvider>
                              </Router>
                            </CloudContext>
                          </startServices.customIntegrations.ContextProvider>
                        </FleetStatusProvider>
                      </UIExtensionsContext.Provider>
                    </EuiThemeProvider>
                  </KibanaThemeProvider>
                </KibanaVersionContext.Provider>
              </ConfigContext.Provider>
            </EuiErrorBoundary>
          </KibanaContextProvider>
        </startServices.i18n.Context>
      </RedirectAppLinks>
    );
  }
);

export const AppRoutes = memo(() => {
  return (
    <>
      <Switch>
        <Route path={INTEGRATIONS_ROUTING_PATHS.integrations}>
          <EPMApp />
        </Route>
        <Route
          render={({ location }) => {
            // BWC < 7.15 Fleet was using a hash router: redirect old routes using hash
            const shouldRedirectHash = location.pathname === '' && location.hash.length > 0;
            if (!shouldRedirectHash) {
              return <Redirect to={pagePathGetters.integrations_all({})[1]} />;
            }
            const pathname = location.hash.replace(/^#/, '');

            return (
              <Redirect
                to={{
                  ...location,
                  pathname,
                  hash: undefined,
                }}
              />
            );
          }}
        />
      </Switch>
    </>
  );
});
