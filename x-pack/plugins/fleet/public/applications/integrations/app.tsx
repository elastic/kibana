/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import type { AppMountParameters } from 'kibana/public';
import { EuiCode, EuiEmptyPrompt, EuiErrorBoundary, EuiPanel } from '@elastic/eui';
import type { History } from 'history';
import { createHashHistory } from 'history';
import { Router, Redirect, Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import useObservable from 'react-use/lib/useObservable';

import {
  ConfigContext,
  FleetStatusProvider,
  KibanaVersionContext,
  sendGetPermissionsCheck,
  sendSetup,
} from '../../hooks';

import type { FleetConfigType, FleetStartServices } from '../../plugin';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';

import { AgentPolicyContextProvider } from './hooks';
import { INTEGRATIONS_ROUTING_PATHS } from './constants';

import { Error, Loading } from './components';

import type { UIExtensionsStorage } from './types';

import { EPMApp } from './sections/epm';
import { DefaultLayout, WithoutHeaderLayout } from './layouts';
import { PackageInstallProvider } from './hooks';
import { useBreadcrumbs, IntraAppStateProvider, UIExtensionsContext } from './hooks';

const ErrorLayout = ({ children }: { children: JSX.Element }) => (
  <EuiErrorBoundary>
    <DefaultLayout>
      <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
    </DefaultLayout>
  </EuiErrorBoundary>
);

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

export const WithPermissionsAndSetup: React.FC = memo(({ children }) => {
  useBreadcrumbs('integrations');

  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      setPermissionsError(undefined);
      setIsInitialized(false);
      setInitializationError(null);
      try {
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
          setPermissionsError(permissionsResponse.data?.error || 'REQUEST_ERROR');
        }
      } catch (err) {
        setPermissionsError('REQUEST_ERROR');
      }
    })();
  }, []);

  if (isPermissionsLoading || permissionsError) {
    return (
      <ErrorLayout>
        {isPermissionsLoading ? (
          <Loading />
        ) : permissionsError === 'REQUEST_ERROR' ? (
          <Error
            title={
              <FormattedMessage
                id="xpack.fleet.permissionsRequestErrorMessageTitle"
                defaultMessage="Unable to check permissions"
              />
            }
            error={i18n.translate('xpack.fleet.permissionsRequestErrorMessageDescription', {
              defaultMessage: 'There was a problem checking Fleet permissions',
            })}
          />
        ) : (
          <Panel>
            <EuiEmptyPrompt
              iconType="securityApp"
              title={
                <h2>
                  {permissionsError === 'MISSING_SUPERUSER_ROLE' ? (
                    <FormattedMessage
                      id="xpack.fleet.permissionDeniedErrorTitle"
                      defaultMessage="Permission denied"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.fleet.securityRequiredErrorTitle"
                      defaultMessage="Security is not enabled"
                    />
                  )}
                </h2>
              }
              body={
                <p>
                  {permissionsError === 'MISSING_SUPERUSER_ROLE' ? (
                    <FormattedMessage
                      id="xpack.fleet.integrationsPermissionDeniedErrorMessage"
                      defaultMessage="You are not authorized to access Integrations. Integrations requires {roleName} privileges."
                      values={{ roleName: <EuiCode>superuser</EuiCode> }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.fleet.integrationsSecurityRequiredErrorMessage"
                      defaultMessage="You must enable security in Kibana and Elasticsearch to use Integrations."
                    />
                  )}
                </p>
              }
            />
          </Panel>
        )}
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
  /** For testing purposes only */
  routerHistory?: History<any>;
}> = memo(
  ({ children, startServices, config, history, kibanaVersion, extensions, routerHistory }) => {
    const isDarkMode = useObservable<boolean>(startServices.uiSettings.get$('theme:darkMode'));
    const [routerHistoryInstance] = useState(routerHistory || createHashHistory());

    return (
      <startServices.i18n.Context>
        <KibanaContextProvider services={{ ...startServices }}>
          <EuiErrorBoundary>
            <ConfigContext.Provider value={config}>
              <KibanaVersionContext.Provider value={kibanaVersion}>
                <EuiThemeProvider darkMode={isDarkMode}>
                  <UIExtensionsContext.Provider value={extensions}>
                    <FleetStatusProvider>
                      <IntraAppStateProvider kibanaScopedHistory={history}>
                        <Router history={routerHistoryInstance}>
                          <AgentPolicyContextProvider>
                            <PackageInstallProvider notifications={startServices.notifications}>
                              {children}
                            </PackageInstallProvider>
                          </AgentPolicyContextProvider>
                        </Router>
                      </IntraAppStateProvider>
                    </FleetStatusProvider>
                  </UIExtensionsContext.Provider>
                </EuiThemeProvider>
              </KibanaVersionContext.Provider>
            </ConfigContext.Provider>
          </EuiErrorBoundary>
        </KibanaContextProvider>
      </startServices.i18n.Context>
    );
  }
);

export const AppRoutes = memo(() => {
  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations}>
        <EPMApp />
      </Route>
      <Redirect to={INTEGRATIONS_ROUTING_PATHS.integrations_all} />
    </Switch>
  );
});
