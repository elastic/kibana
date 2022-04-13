/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { memo, useEffect, useState } from 'react';
import type { AppMountParameters } from 'kibana/public';
import { EuiCode, EuiEmptyPrompt, EuiErrorBoundary, EuiPanel } from '@elastic/eui';
import type { History } from 'history';
import { Router, Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import useObservable from 'react-use/lib/useObservable';

import type { TopNavMenuData } from 'src/plugins/navigation/public';

import { KibanaThemeProvider } from '../../../../../../src/plugins/kibana_react/public';

import type { FleetConfigType, FleetStartServices } from '../../plugin';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';

import { PackageInstallProvider } from '../integrations/hooks';

import { useAuthz } from './hooks';

import {
  ConfigContext,
  FleetStatusProvider,
  KibanaVersionContext,
  sendGetPermissionsCheck,
  sendSetup,
  useBreadcrumbs,
  useStartServices,
  UIExtensionsContext,
} from './hooks';
import { Error, Loading, FleetSetupLoading } from './components';
import type { UIExtensionsStorage } from './types';

import { FLEET_ROUTING_PATHS } from './constants';
import { DefaultLayout, DefaultPageTitle, WithoutHeaderLayout, WithHeaderLayout } from './layouts';
import { AgentPolicyApp } from './sections/agent_policy';
import { DataStreamApp } from './sections/data_stream';
import { AgentsApp } from './sections/agents';
import { MissingESRequirementsPage } from './sections/agents/agent_requirements_page';
import { CreatePackagePolicyPage } from './sections/agent_policy/create_package_policy_page';
import { EnrollmentTokenListPage } from './sections/agents/enrollment_token_list_page';
import { SettingsApp } from './sections/settings';

const FEEDBACK_URL = 'https://ela.st/fleet-feedback';

const ErrorLayout: FunctionComponent<{ isAddIntegrationsPath: boolean }> = ({
  isAddIntegrationsPath,
  children,
}) => (
  <EuiErrorBoundary>
    {isAddIntegrationsPath ? (
      <WithHeaderLayout leftColumn={<DefaultPageTitle />}>{children}</WithHeaderLayout>
    ) : (
      <DefaultLayout>
        <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
      </DefaultLayout>
    )}
  </EuiErrorBoundary>
);

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

const PermissionsError: React.FunctionComponent<{ error: string }> = memo(({ error }) => {
  if (error === 'MISSING_SECURITY') {
    return <MissingESRequirementsPage missingRequirements={['security_required', 'api_keys']} />;
  }

  if (error === 'MISSING_PRIVILEGES') {
    return (
      <Panel data-test-subj="missingPrivilegesPrompt">
        <EuiEmptyPrompt
          iconType="securityApp"
          title={
            <h2 data-test-subj="missingPrivilegesPromptTitle">
              <FormattedMessage
                id="xpack.fleet.permissionDeniedErrorTitle"
                defaultMessage="Permission denied"
              />
            </h2>
          }
          body={
            <p data-test-subj="missingPrivilegesPromptMessage">
              <FormattedMessage
                id="xpack.fleet.permissionDeniedErrorMessage"
                defaultMessage="You are not authorized to access Fleet. It requires the {roleName1} Kibana privilege for Fleet, and the {roleName2} or {roleName1} privilege for Integrations."
                values={{
                  roleName1: <EuiCode>&quot;All&quot;</EuiCode>,
                  roleName2: <EuiCode>&quot;Read&quot;</EuiCode>,
                }}
              />
            </p>
          }
        />
      </Panel>
    );
  }

  return (
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
  );
});

export const WithPermissionsAndSetup: React.FC = memo(({ children }) => {
  useBreadcrumbs('base');
  const core = useStartServices();
  const { notifications } = core;

  const hasFleetAllPrivileges = useAuthz().fleet.all;

  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  const isAddIntegrationsPath = !!useRouteMatch(FLEET_ROUTING_PATHS.add_integration_to_policy);

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
            if (!hasFleetAllPrivileges) {
              setPermissionsError('MISSING_PRIVILEGES');
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
  }, [notifications.toasts, hasFleetAllPrivileges]);

  if (isPermissionsLoading || permissionsError) {
    return (
      <ErrorLayout isAddIntegrationsPath={isAddIntegrationsPath}>
        {isPermissionsLoading ? <Loading /> : <PermissionsError error={permissionsError!} />}
      </ErrorLayout>
    );
  }

  if (!isInitialized || initializationError) {
    return (
      <ErrorLayout isAddIntegrationsPath={isAddIntegrationsPath}>
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
          <FleetSetupLoading />
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
  startServices: FleetStartServices;
  config: FleetConfigType;
  history: AppMountParameters['history'];
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
  theme$: AppMountParameters['theme$'];
  /** For testing purposes only */
  routerHistory?: History<any>;
}> = memo(
  ({
    children,
    startServices,
    config,
    history,
    kibanaVersion,
    extensions,
    routerHistory,
    theme$,
  }) => {
    const isDarkMode = useObservable<boolean>(startServices.uiSettings.get$('theme:darkMode'));

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
                          <Router history={history}>
                            <PackageInstallProvider
                              notifications={startServices.notifications}
                              theme$={theme$}
                            >
                              {children}
                            </PackageInstallProvider>
                          </Router>
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

const FleetTopNav = memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    const services = useStartServices();

    const { TopNavMenu } = services.navigation.ui;

    const topNavConfig: TopNavMenuData[] = [
      {
        label: i18n.translate('xpack.fleet.appNavigation.sendFeedbackButton', {
          defaultMessage: 'Send feedback',
        }),
        iconType: 'popout',
        run: () => window.open(FEEDBACK_URL),
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
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    return (
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

          <Route path={FLEET_ROUTING_PATHS.settings}>
            <SettingsApp />
          </Route>

          {/* TODO: Move this route to the Integrations app */}
          <Route path={FLEET_ROUTING_PATHS.add_integration_to_policy}>
            <CreatePackagePolicyPage />
          </Route>

          <Route
            render={({ location }) => {
              // BWC < 7.15 Fleet was using a hash router: redirect old routes using hash
              const shouldRedirectHash = location.pathname === '' && location.hash.length > 0;
              if (!shouldRedirectHash) {
                return <Redirect to={FLEET_ROUTING_PATHS.agents} />;
              }
              const pathname = location.hash.replace(/^#(\/fleet)?/, '');

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
  }
);
