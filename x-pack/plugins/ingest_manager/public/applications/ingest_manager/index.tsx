/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useObservable } from 'react-use';
import { HashRouter as Router, Redirect, Switch, Route, RouteProps } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { EuiErrorBoundary } from '@elastic/eui';
import { EuiThemeProvider } from '../../../../../legacy/common/eui_styled_components';
import {
  IngestManagerSetupDeps,
  IngestManagerConfigType,
  IngestManagerStartDeps,
} from '../../plugin';
import { EPM_PATH, FLEET_PATH, AGENT_CONFIG_PATH } from './constants';
import { DefaultLayout } from './layouts';
import { IngestManagerOverview, EPMApp, AgentConfigApp, FleetApp } from './sections';
import {
  CoreContext,
  DepsContext,
  ConfigContext,
  setHttpClient,
  useConfig,
  useCore,
} from './hooks';
import { PackageInstallProvider } from './sections/epm/hooks';
import { sendSetup } from './hooks/use_request/setup';

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

const IngestManagerRoutes = ({ ...rest }) => {
  const { epm, fleet } = useConfig();
  const { notifications } = useCore();

  const [isInitialized, setIsIntialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await sendSetup();
        if (res.error) {
          throw res.error;
        }
        setIsIntialized(true);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: 'Unable to initialized ingestManager',
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isInitialized) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <Router {...rest}>
        <Switch>
          <ProtectedRoute path={EPM_PATH} isAllowed={epm.enabled}>
            <DefaultLayout section="epm">
              <EPMApp />
            </DefaultLayout>
          </ProtectedRoute>
          <Route path={AGENT_CONFIG_PATH}>
            <DefaultLayout section="agent_config">
              <AgentConfigApp />
            </DefaultLayout>
          </Route>
          <ProtectedRoute path={FLEET_PATH} isAllowed={fleet.enabled}>
            <DefaultLayout section="fleet">
              <FleetApp />
            </DefaultLayout>
          </ProtectedRoute>
          <Route exact path="/">
            <DefaultLayout section="overview">
              <IngestManagerOverview />
            </DefaultLayout>
          </Route>
          <Redirect to="/" />
        </Switch>
      </Router>
    </EuiErrorBoundary>
  );
};

const IngestManagerApp = ({
  basepath,
  coreStart,
  setupDeps,
  startDeps,
  config,
}: {
  basepath: string;
  coreStart: CoreStart;
  setupDeps: IngestManagerSetupDeps;
  startDeps: IngestManagerStartDeps;
  config: IngestManagerConfigType;
}) => {
  const isDarkMode = useObservable<boolean>(coreStart.uiSettings.get$('theme:darkMode'));
  return (
    <coreStart.i18n.Context>
      <CoreContext.Provider value={coreStart}>
        <DepsContext.Provider value={{ setup: setupDeps, start: startDeps }}>
          <ConfigContext.Provider value={config}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <PackageInstallProvider notifications={coreStart.notifications}>
                <IngestManagerRoutes basepath={basepath} />
              </PackageInstallProvider>
            </EuiThemeProvider>
          </ConfigContext.Provider>
        </DepsContext.Provider>
      </CoreContext.Provider>
    </coreStart.i18n.Context>
  );
};

export function renderApp(
  coreStart: CoreStart,
  { element, appBasePath }: AppMountParameters,
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
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
