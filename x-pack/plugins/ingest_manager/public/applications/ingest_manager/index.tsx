/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';

import { IngestManagerSetupDeps, IngestManagerConfigType } from '../../plugin';
import { EPM_PATH, FLEET_PATH } from './constants';
import { DefaultLayout } from './layouts';
import { IngestManagerOverview, EPMApp, FleetApp } from './sections';
import { CoreContext, DepsContext, ConfigContext } from './hooks';

const IngestManagerRoutes = ({ ...rest }) => (
  <Router {...rest}>
    <Switch>
      <Route path={EPM_PATH}>
        <DefaultLayout section="epm">
          <EPMApp />
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
);

export function renderApp(
  coreStart: CoreStart,
  { element }: AppMountParameters,
  deps: IngestManagerSetupDeps,
  config: IngestManagerConfigType
) {
  ReactDOM.render(
    <coreStart.i18n.Context>
      <CoreContext.Provider value={coreStart}>
        <DepsContext.Provider value={deps}>
          <ConfigContext.Provider value={config}>
            <IngestManagerRoutes />
          </ConfigContext.Provider>
        </DepsContext.Provider>
      </CoreContext.Provider>
    </coreStart.i18n.Context>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
