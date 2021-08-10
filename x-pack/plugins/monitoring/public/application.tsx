/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart, AppMountParameters } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { MonitoringStartPluginDependencies } from './types';
import { OverviewPage } from './react/overview_page';

export const renderApp = (
  core: CoreStart,
  plugins: MonitoringStartPluginDependencies,
  { element, history, setHeaderActionMenu }: AppMountParameters
) => {
  ReactDOM.render(<MonitoringApp history={history} core={core} plugins={plugins} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MonitoringApp: React.FC<{
  core: CoreStart;
  history: History<unknown>;
  plugins: MonitoringStartPluginDependencies;
}> = ({ core, history, plugins }) => {
  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <Router history={history}>
        <Switch>
          <Route path="/overview" component={OverviewPage} />
        </Switch>
      </Router>
    </KibanaContextProvider>
  );
};
