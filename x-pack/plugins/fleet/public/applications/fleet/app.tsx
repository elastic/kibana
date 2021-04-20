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

import type { FleetConfigType, FleetStartServices } from '../../plugin';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';

import {
  ConfigContext,
  FleetStatusProvider,
  KibanaVersionContext,
  sendGetPermissionsCheck,
  sendSetup,
  useBreadcrumbs,
  useConfig,
  useStartServices,
} from './hooks';
import { Error, Loading } from './components';
import { IntraAppStateProvider } from './hooks/use_intra_app_state';
import { PackageInstallProvider } from './sections/epm/hooks';
import { PAGE_ROUTING_PATHS } from './constants';
import { DefaultLayout, WithoutHeaderLayout } from './layouts';
import { EPMApp } from './sections/epm';
import { AgentPolicyApp } from './sections/agent_policy';
import { DataStreamApp } from './sections/data_stream';
import { FleetApp } from './sections/agents';
import { IngestManagerOverview } from './sections/overview';
import { ProtectedRoute } from './index';
import type { UIExtensionsStorage } from './types';
import { UIExtensionsContext } from './hooks/use_ui_extension';

const ErrorLayout = ({ children }: { children: JSX.Element }) => (
  <EuiErrorBoundary>
    <DefaultLayout showSettings={false}>
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
  useBreadcrumbs('base');
  const { notifications } = useStartServices();

  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      setIsPermissionsLoading(false);
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
            if (setupResponse.data.preconfigurationError) {
              notifications.toasts.addError(setupResponse.data.preconfigurationError, {
                title: i18n.translate('xpack.fleet.setup.uiPreconfigurationErrorTitle', {
                  defaultMessage: 'Configuration error',
                }),
              });
            }
            if (setupResponse.data.nonFatalPackageUpgradeErrors) {
              notifications.toasts.addError(setupResponse.data.nonFatalPackageUpgradeErrors, {
                title: i18n.translate('xpack.fleet.setup.nonFatalPackageErrorsTitle', {
                  defaultMessage: 'One or more packages could not be successfully upgraded',
                }),
              });
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
  }, [notifications.toasts]);

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
                      id="xpack.fleet.permissionDeniedErrorMessage"
                      defaultMessage="You are not authorized to access Fleet. Fleet requires {roleName} privileges."
                      values={{ roleName: <EuiCode>superuser</EuiCode> }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.fleet.securityRequiredErrorMessage"
                      defaultMessage="You must enable security in Kibana and Elasticsearch to use Fleet."
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
export const FleetAppContext: React.FC<{
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
                          <PackageInstallProvider notifications={startServices.notifications}>
                            {children}
                          </PackageInstallProvider>
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
  const { agents } = useConfig();

  return (
    <Switch>
      <Route path={PAGE_ROUTING_PATHS.integrations}>
        <DefaultLayout section="epm">
          <EPMApp />
        </DefaultLayout>
      </Route>
      <Route path={PAGE_ROUTING_PATHS.policies}>
        <DefaultLayout section="agent_policy">
          <AgentPolicyApp />
        </DefaultLayout>
      </Route>
      <Route path={PAGE_ROUTING_PATHS.data_streams}>
        <DefaultLayout section="data_stream">
          <DataStreamApp />
        </DefaultLayout>
      </Route>
      <ProtectedRoute path={PAGE_ROUTING_PATHS.fleet} isAllowed={agents.enabled}>
        <DefaultLayout section="fleet">
          <FleetApp />
        </DefaultLayout>
      </ProtectedRoute>
      <Route exact path={PAGE_ROUTING_PATHS.overview}>
        <DefaultLayout section="overview">
          <IngestManagerOverview />
        </DefaultLayout>
      </Route>
      <Redirect to="/" />
    </Switch>
  );
});
