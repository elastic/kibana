/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCode, EuiEmptyPrompt, EuiErrorBoundary, EuiPanel, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { History } from 'history';
import type { FunctionComponent } from 'react';
import React, { memo, useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch, useRouteMatch } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import styled from 'styled-components';

import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import type { TopNavMenuData } from '../../../../../../src/plugins/navigation/public/top_nav_menu/top_nav_menu_data';
import type { FleetConfigType } from '../../../common/types';
import { Error } from '../../components/error';
import { FleetSetupLoading } from '../../components/fleet_setup_loading';
import { Loading } from '../../components/loading';
import { SettingFlyout } from '../../components/settings_flyout';
import { FLEET_ROUTING_PATHS } from '../../constants/page_paths';
import { ConfigContext } from '../../hooks/use_config';
import { useStartServices } from '../../hooks/use_core';
import { FleetStatusProvider } from '../../hooks/use_fleet_status';
import { KibanaVersionContext } from '../../hooks/use_kibana_version';
import { sendGetPermissionsCheck } from '../../hooks/use_request/app';
import { sendSetup } from '../../hooks/use_request/setup';
import { UIExtensionsContext } from '../../hooks/use_ui_extension';
import { useUrlModal } from '../../hooks/use_url_modal';
import { WithoutHeaderLayout } from '../../layouts/without_header';
import { WithHeaderLayout } from '../../layouts/with_header';
import type { FleetStartServices } from '../../plugin';
import type { UIExtensionsStorage } from '../../types/ui_extensions';
import { PackageInstallProvider } from '../integrations/hooks/use_package_install';

import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { DefaultLayout } from './layouts/default/default';
import { DefaultPageTitle } from './layouts/default/default_page_title';
import { AgentsApp } from './sections/agents';
import { EnrollmentTokenListPage } from './sections/agents/enrollment_token_list_page';
import { AgentPolicyApp } from './sections/agent_policy';
import { CreatePackagePolicyPage } from './sections/agent_policy/create_package_policy_page';
import { DataStreamApp } from './sections/data_stream';

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

export const WithPermissionsAndSetup: React.FC = memo(({ children }) => {
  useBreadcrumbs('base');
  const { notifications } = useStartServices();

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
      <ErrorLayout isAddIntegrationsPath={isAddIntegrationsPath}>
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
                        <Router history={history}>
                          <PackageInstallProvider notifications={startServices.notifications}>
                            {children}
                          </PackageInstallProvider>
                        </Router>
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
        run: () => services.application.navigateToUrl(getModalHref('settings')),
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
    const { modal, setModal } = useUrlModal();

    return (
      <>
        <FleetTopNav setHeaderActionMenu={setHeaderActionMenu} />

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
