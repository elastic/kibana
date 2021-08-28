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
import React, { memo, useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import styled from 'styled-components';

import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import type { FleetConfigType } from '../../../common/types';
import { Error } from '../../components/error';
import { Loading } from '../../components/loading';
import { SettingFlyout } from '../../components/settings_flyout';
import { INTEGRATIONS_ROUTING_PATHS } from '../../constants/page_paths';
import { ConfigContext } from '../../hooks/use_config';
import { FleetStatusProvider } from '../../hooks/use_fleet_status';
import { KibanaVersionContext } from '../../hooks/use_kibana_version';
import { sendGetPermissionsCheck } from '../../hooks/use_request/app';
import { sendSetup } from '../../hooks/use_request/setup';
import { UIExtensionsContext } from '../../hooks/use_ui_extension';
import { useUrlModal } from '../../hooks/use_url_modal';
import { WithoutHeaderLayout } from '../../layouts/without_header';
import type { FleetStartServices } from '../../plugin';
import type { UIExtensionsStorage } from '../../types/ui_extensions';

import { AgentPolicyContextProvider } from './hooks/use_agent_policy_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { PackageInstallProvider } from './hooks/use_package_install';
import { DefaultLayout } from './layouts/default';
import { EPMApp } from './sections/epm';

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
  routerHistory?: History<any>; // TODO remove
}> = memo(({ children, startServices, config, history, kibanaVersion, extensions }) => {
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
                        <AgentPolicyContextProvider>
                          <PackageInstallProvider notifications={startServices.notifications}>
                            {children}
                          </PackageInstallProvider>
                        </AgentPolicyContextProvider>
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
});

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
              return <Redirect to={INTEGRATIONS_ROUTING_PATHS.integrations_all} />;
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
