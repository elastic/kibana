/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useObservable } from 'react-use';
import { HashRouter as Router, Redirect, Switch, Route, RouteProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { EuiErrorBoundary, EuiPanel, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { CoreStart, AppMountParameters } from 'src/core/public';
import { EuiThemeProvider } from '../../../../../legacy/common/eui_styled_components';
import {
  IngestManagerSetupDeps,
  IngestManagerConfigType,
  IngestManagerStartDeps,
} from '../../plugin';
import { PAGE_ROUTING_PATHS } from './constants';
import { DefaultLayout, WithoutHeaderLayout } from './layouts';
import { Loading, Error } from './components';
import { IngestManagerOverview, EPMApp, AgentConfigApp, FleetApp, DataStreamApp } from './sections';
import { DepsContext, ConfigContext, setHttpClient, useConfig } from './hooks';
import { PackageInstallProvider } from './sections/epm/hooks';
import { useCore, sendSetup, sendGetPermissionsCheck } from './hooks';
import { FleetStatusProvider } from './hooks/use_fleet_status';
import './index.scss';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { IntraAppStateProvider } from './hooks/use_intra_app_state';

export interface ProtectedRouteProps extends RouteProps {
  isAllowed?: boolean;
  restrictedPath?: string;
}

export const ProtectedRoute: React.FunctionComponent<ProtectedRouteProps> = ({
  isAllowed = false,
  restrictedPath = '/',
  ...routeProps
}: ProtectedRouteProps) => {
  return isAllowed ? <Route {...routeProps} /> : <Redirect to={{ pathname: restrictedPath }} />;
};

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

const ErrorLayout = ({ children }: { children: JSX.Element }) => (
  <EuiErrorBoundary>
    <DefaultLayout showSettings={false}>
      <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
    </DefaultLayout>
  </EuiErrorBoundary>
);

const IngestManagerRoutes = memo<{ history: AppMountParameters['history']; basepath: string }>(
  ({ history, ...rest }) => {
    const { epm, fleet } = useConfig();
    const { notifications } = useCore();

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  id="xpack.ingestManager.permissionsRequestErrorMessageTitle"
                  defaultMessage="Unable to check permissions"
                />
              }
              error={i18n.translate(
                'xpack.ingestManager.permissionsRequestErrorMessageDescription',
                {
                  defaultMessage: 'There was a problem checking Ingest Manager permissions',
                }
              )}
            />
          ) : (
            <Panel>
              <EuiEmptyPrompt
                iconType="securityApp"
                title={
                  <h2>
                    {permissionsError === 'MISSING_SUPERUSER_ROLE' ? (
                      <FormattedMessage
                        id="xpack.ingestManager.permissionDeniedErrorTitle"
                        defaultMessage="Permission denied"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.ingestManager.securityRequiredErrorTitle"
                        defaultMessage="Security is not enabled"
                      />
                    )}
                  </h2>
                }
                body={
                  <p>
                    {permissionsError === 'MISSING_SUPERUSER_ROLE' ? (
                      <FormattedMessage
                        id="xpack.ingestManager.permissionDeniedErrorMessage"
                        defaultMessage="You are not authorized to access Ingest Manager. Ingest Manager requires {roleName} privileges."
                        values={{ roleName: <EuiCode>superuser</EuiCode> }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.ingestManager.securityRequiredErrorMessage"
                        defaultMessage="You must enable security in Kibana and Elasticsearch to use Ingest Manager."
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
                  id="xpack.ingestManager.initializationErrorMessageTitle"
                  defaultMessage="Unable to initialize Ingest Manager"
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

    return (
      <EuiErrorBoundary>
        <FleetStatusProvider>
          <IntraAppStateProvider kibanaScopedHistory={history}>
            <Router {...rest}>
              <PackageInstallProvider notifications={notifications}>
                <Switch>
                  <ProtectedRoute path={PAGE_ROUTING_PATHS.integrations} isAllowed={epm.enabled}>
                    <DefaultLayout section="epm">
                      <EPMApp />
                    </DefaultLayout>
                  </ProtectedRoute>
                  <Route path={PAGE_ROUTING_PATHS.configurations}>
                    <DefaultLayout section="agent_config">
                      <AgentConfigApp />
                    </DefaultLayout>
                  </Route>
                  <Route path={PAGE_ROUTING_PATHS.data_streams}>
                    <DefaultLayout section="data_stream">
                      <DataStreamApp />
                    </DefaultLayout>
                  </Route>
                  <ProtectedRoute path={PAGE_ROUTING_PATHS.fleet} isAllowed={fleet.enabled}>
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
              </PackageInstallProvider>
            </Router>
          </IntraAppStateProvider>
        </FleetStatusProvider>
      </EuiErrorBoundary>
    );
  }
);

const IngestManagerApp = ({
  basepath,
  coreStart,
  setupDeps,
  startDeps,
  config,
  history,
}: {
  basepath: string;
  coreStart: CoreStart;
  setupDeps: IngestManagerSetupDeps;
  startDeps: IngestManagerStartDeps;
  config: IngestManagerConfigType;
  history: AppMountParameters['history'];
}) => {
  const isDarkMode = useObservable<boolean>(coreStart.uiSettings.get$('theme:darkMode'));
  return (
    <coreStart.i18n.Context>
      <KibanaContextProvider services={{ ...coreStart }}>
        <DepsContext.Provider value={{ setup: setupDeps, start: startDeps }}>
          <ConfigContext.Provider value={config}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <IngestManagerRoutes history={history} basepath={basepath} />
            </EuiThemeProvider>
          </ConfigContext.Provider>
        </DepsContext.Provider>
      </KibanaContextProvider>
    </coreStart.i18n.Context>
  );
};

export function renderApp(
  coreStart: CoreStart,
  { element, appBasePath, history }: AppMountParameters,
  setupDeps: IngestManagerSetupDeps,
  startDeps: IngestManagerStartDeps,
  config: IngestManagerConfigType
) {
  setHttpClient(coreStart.http);
  ReactDOM.render(
    <IngestManagerApp
      basepath={appBasePath}
      coreStart={coreStart}
      setupDeps={setupDeps}
      startDeps={startDeps}
      config={config}
      history={history}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

export const teardownIngestManager = (coreStart: CoreStart) => {
  coreStart.chrome.docTitle.reset();
  coreStart.chrome.setBreadcrumbs([]);
};
