/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import { EuiErrorBoundary, EuiPortal } from '@elastic/eui';
import type { History } from 'history';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import useObservable from 'react-use/lib/useObservable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import type { FleetConfigType, FleetStartServices } from '../../plugin';

import {
  ConfigContext,
  FleetStatusProvider,
  type FleetStatusProviderProps,
  KibanaVersionContext,
  useFleetStatus,
} from '../../hooks';

import { FleetServerFlyout } from '../fleet/components';

import { AgentPolicyContextProvider, useFlyoutContext } from './hooks';
import { INTEGRATIONS_ROUTING_PATHS, pagePathGetters } from './constants';

import type { UIExtensionsStorage } from './types';

import { EPMApp } from './sections/epm';
import { PackageInstallProvider, UIExtensionsContext, FlyoutContextProvider } from './hooks';
import { IntegrationsHeader } from './components/header';
import { AgentEnrollmentFlyout } from './components';

const queryClient = new QueryClient();

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
  fleetStatus?: FleetStatusProviderProps;
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
    fleetStatus,
  }) => {
    const theme = useObservable(theme$);
    const isDarkMode = theme && theme.darkMode;

    const CloudContext = startServices.cloud?.CloudContextProvider || EmptyContext;

    return (
      <RedirectAppLinks
        coreStart={{
          application: startServices.application,
        }}
      >
        <startServices.i18n.Context>
          <KibanaContextProvider services={{ ...startServices }}>
            <EuiErrorBoundary>
              <ConfigContext.Provider value={config}>
                <KibanaVersionContext.Provider value={kibanaVersion}>
                  <KibanaThemeProvider theme$={theme$}>
                    <EuiThemeProvider darkMode={isDarkMode}>
                      <QueryClientProvider client={queryClient}>
                        <ReactQueryDevtools initialIsOpen={false} />
                        <UIExtensionsContext.Provider value={extensions}>
                          <FleetStatusProvider defaultFleetStatus={fleetStatus}>
                            <startServices.customIntegrations.ContextProvider>
                              <CloudContext>
                                <Router history={history}>
                                  <AgentPolicyContextProvider>
                                    <PackageInstallProvider
                                      notifications={startServices.notifications}
                                      theme$={theme$}
                                    >
                                      <FlyoutContextProvider>
                                        <IntegrationsHeader {...{ setHeaderActionMenu, theme$ }} />
                                        {children}
                                      </FlyoutContextProvider>
                                    </PackageInstallProvider>
                                  </AgentPolicyContextProvider>
                                </Router>
                              </CloudContext>
                            </startServices.customIntegrations.ContextProvider>
                          </FleetStatusProvider>
                        </UIExtensionsContext.Provider>
                      </QueryClientProvider>
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
  const flyoutContext = useFlyoutContext();
  const fleetStatus = useFleetStatus();

  return (
    <>
      <Routes>
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
      </Routes>

      {flyoutContext.isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            defaultMode={
              fleetStatus.isReady && fleetStatus.missingRequirements?.includes('fleet_server')
                ? 'managed'
                : 'standalone'
            }
            isIntegrationFlow={true}
            onClose={() => flyoutContext.closeEnrollmentFlyout()}
          />
        </EuiPortal>
      )}

      {flyoutContext.isFleetServerFlyoutOpen && (
        <EuiPortal>
          <FleetServerFlyout onClose={() => flyoutContext.closeFleetServerFlyout()} />
        </EuiPortal>
      )}
    </>
  );
});
