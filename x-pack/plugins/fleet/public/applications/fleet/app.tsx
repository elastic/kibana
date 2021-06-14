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

import type { TopNavMenuData } from 'src/plugins/navigation/public';

import type { FleetConfigType, FleetStartServices } from '../../plugin';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';

import { PackageInstallProvider, useUrlModal } from '../integrations/hooks';

import {
  ConfigContext,
  FleetStatusProvider,
  IntraAppStateProvider,
  KibanaVersionContext,
  sendGetPermissionsCheck,
  sendSetup,
  useBreadcrumbs,
  useStartServices,
  UIExtensionsContext,
} from './hooks';
import { Error, Loading } from './components';
import type { UIExtensionsStorage } from './types';

import { FLEET_ROUTING_PATHS } from './constants';
import { DefaultLayout, WithoutHeaderLayout } from './layouts';
import { AgentPolicyApp } from './sections/agent_policy';
import { DataStreamApp } from './sections/data_stream';
import { AgentsApp } from './sections/agents';
import { CreatePackagePolicyPage } from './sections/agent_policy/create_package_policy_page';
import { EnrollmentTokenListPage } from './sections/agents/enrollment_token_list_page';

const FEEDBACK_URL = 'https://ela.st/fleet-feedback';

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
            if (setupResponse.data?.nonFatalErrors?.length) {
              notifications.toasts.addError(setupResponse.data.nonFatalErrors[0], {
                title: i18n.translate('xpack.fleet.setup.uiPreconfigurationErrorTitle', {
                  defaultMessage: 'Configuration error',
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

const FleetTopNav = memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    const { getModalHref } = useUrlModal();
    const services = useStartServices();

    const { TopNavMenu } = services.navigation.ui;

    const topNavConfig: TopNavMenuData[] = [
      {
        label: i18n.translate('xpack.fleet.appNavigation.sendFeedbackButton', {
          defaultMessage: 'Send Feedback',
        }),
        iconType: 'popout',
        run: () => window.open(FEEDBACK_URL),
      },

      {
        label: i18n.translate('xpack.fleet.appNavigation.settingsButton', {
          defaultMessage: 'Fleet settings',
        }),
        iconType: 'gear',
        run: () => (window.location.href = getModalHref('settings')),
      },
    ];
    return (
      <TopNavMenu
        appName={i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' })}
        config={topNavConfig}
        setMenuMountPoint={setHeaderActionMenu}
      />
    );
  }
);

export const AppRoutes = memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => (
    <>
      <FleetTopNav setHeaderActionMenu={setHeaderActionMenu} />

      <Switch>
        <Route path={FLEET_ROUTING_PATHS.agents}>
          <AgentsApp />
        </Route>
        <Route path={FLEET_ROUTING_PATHS.policies}>
          <AgentPolicyApp />
        </Route>
        <Route path={FLEET_ROUTING_PATHS.enrollment_tokens}>
          <EnrollmentTokenListPage />
        </Route>
        <Route path={FLEET_ROUTING_PATHS.data_streams}>
          <DataStreamApp />
        </Route>

        {/* TODO: Move this route to the Integrations app */}
        <Route path={FLEET_ROUTING_PATHS.add_integration_to_policy}>
          <DefaultLayout>
            <CreatePackagePolicyPage />
          </DefaultLayout>
        </Route>

        <Redirect to={FLEET_ROUTING_PATHS.agents} />
      </Switch>
    </>
  )
);
