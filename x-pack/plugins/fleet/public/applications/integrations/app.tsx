/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import type { AppMountParameters } from 'kibana/public';
import { EuiErrorBoundary, EuiPortal } from '@elastic/eui';
import type { History } from 'history';
import { Router, Redirect, Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import useObservable from 'react-use/lib/useObservable';

import {
  ConfigContext,
  FleetStatusProvider,
  KibanaVersionContext,
  sendGetPermissionsCheck,
  sendSetup,
} from '../../hooks';

import type { FleetConfigType, FleetStartServices } from '../../plugin';

import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';

import { AgentPolicyContextProvider, useUrlModal } from './hooks';
import { INTEGRATIONS_ROUTING_PATHS, pagePathGetters } from './constants';

import { Error, Loading, SettingFlyout } from './components';

import type { UIExtensionsStorage } from './types';

import { EPMApp } from './sections/epm';
import { DefaultLayout, WithoutHeaderLayout } from './layouts';
import { PackageInstallProvider } from './hooks';
import { useBreadcrumbs, UIExtensionsContext } from './hooks';
import { IntegrationsHeader } from './components/header';

const ErrorLayout = ({ children }: { children: JSX.Element }) => (
  <EuiErrorBoundary>
    <DefaultLayout>
      <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
    </DefaultLayout>
  </EuiErrorBoundary>
);

export const WithPermissionsAndSetup: React.FC = memo(({ children }) => {
  useBreadcrumbs('integrations');

  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      setIsInitialized(false);
      setInitializationError(null);
      try {
        // Attempt Fleet Setup if user has permissions, otherwise skip
        setIsPermissionsLoading(true);
        const permissionsResponse = await sendGetPermissionsCheck();
        setIsPermissionsLoading(false);

        if (permissionsResponse.data?.success) {
          try {
            const setupResponse = await sendSetup();
            if (setupResponse.error) {
              setInitializationError(setupResponse.error);
            }
          } catch (err) {
            setInitializationError(err);
          }
          setIsInitialized(true);
        } else {
          setIsInitialized(true);
        }
      } catch {
        // If there's an error checking permissions, default to proceeding without running setup
        // User will only have access to EPM endpoints if they actually have permission
        setIsInitialized(true);
      }
    })();
  }, []);

  if (isPermissionsLoading) {
    return (
      <ErrorLayout>
        <Loading />
      </ErrorLayout>
    );
  }

  if (!isInitialized || initializationError) {
    return (
      <ErrorLayout>
        {initializationError ? (
          <Error
            title={
              <FormattedMessage
                id="xpack.fleet.initializationErrorMessageTitle"
                defaultMessage="Unable to initialize Fleet"
              />
            }
            error={initializationError}
          />
        ) : (
          <Loading />
        )}
      </ErrorLayout>
    );
  }

  return <>{children}</>;
});

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
  }) => {
    const isDarkMode = useObservable<boolean>(startServices.uiSettings.get$('theme:darkMode'));

    return (
      <RedirectAppLinks application={startServices.application}>
        <startServices.i18n.Context>
          <KibanaContextProvider services={{ ...startServices }}>
            <EuiErrorBoundary>
              <ConfigContext.Provider value={config}>
                <KibanaVersionContext.Provider value={kibanaVersion}>
                  <EuiThemeProvider darkMode={isDarkMode}>
                    <UIExtensionsContext.Provider value={extensions}>
                      <FleetStatusProvider>
                        <startServices.customIntegrations.ContextProvider>
                          <Router history={history}>
                            <AgentPolicyContextProvider>
                              <PackageInstallProvider notifications={startServices.notifications}>
                                <IntegrationsHeader {...{ setHeaderActionMenu }} />
                                {children}
                              </PackageInstallProvider>
                            </AgentPolicyContextProvider>
                          </Router>
                        </startServices.customIntegrations.ContextProvider>
                      </FleetStatusProvider>
                    </UIExtensionsContext.Provider>
                  </EuiThemeProvider>
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
  const { modal, setModal } = useUrlModal();
  return (
    <>
      {modal === 'settings' && (
        <EuiPortal>
          <SettingFlyout
            onClose={() => {
              setModal(null);
            }}
          />
        </EuiPortal>
      )}
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
