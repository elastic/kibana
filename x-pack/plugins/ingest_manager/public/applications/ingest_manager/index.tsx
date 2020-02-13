/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { useObservable } from 'react-use';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
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
import { CoreContext, DepsContext, ConfigContext, setHttpClient } from './hooks';
import { PackageInstallProvider } from './sections/epm/hooks';

const IngestManagerRoutes = ({ ...rest }) => (
  <EuiErrorBoundary>
    <Router {...rest}>
      <Switch>
        <Route path={EPM_PATH}>
          <DefaultLayout section="epm">
            <EPMApp />
          </DefaultLayout>
        </Route>
        <Route path={AGENT_CONFIG_PATH}>
          <DefaultLayout section="agent_config">
            <AgentConfigApp />
          </DefaultLayout>
        </Route>
        <Route path={FLEET_PATH}>
          <DefaultLayout section="fleet">
            <FleetApp />
          </DefaultLayout>
        </Route>
        <Route path="/">
          <DefaultLayout section="overview">
            <IngestManagerOverview />
          </DefaultLayout>
        </Route>
      </Switch>
    </Router>
  </EuiErrorBoundary>
);

const IngestManagerApp = ({
  coreStart,
  setupDeps,
  startDeps,
  config,
}: {
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
                <IngestManagerRoutes />
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
  { element }: AppMountParameters,
  setupDeps: IngestManagerSetupDeps,
  startDeps: IngestManagerStartDeps,
  config: IngestManagerConfigType
) {
  setHttpClient(coreStart.http);
  ReactDOM.render(
    <IngestManagerApp
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
