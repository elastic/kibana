/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, AppMountParameters } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Switch, Redirect, HashRouter } from 'react-router-dom';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { LoadingPage } from './pages/loading_page';
import { MonitoringStartPluginDependencies } from '../types';

export const renderApp = (
  core: CoreStart,
  plugins: MonitoringStartPluginDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<MonitoringApp core={core} plugins={plugins} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MonitoringApp: React.FC<{
  core: CoreStart;
  plugins: MonitoringStartPluginDependencies;
}> = ({ core, plugins }) => {
  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <HashRouter>
        <Switch>
          <Route path="/loading" component={LoadingPage} />
          <Route path="/no-data" component={NoData} />
          <Route path="/home" component={Home} />
          <Route path="/overview" component={ClusterOverview} />
          <Redirect
            to={{
              pathname: '/loading',
            }}
          />
        </Switch>
      </HashRouter>
    </KibanaContextProvider>
  );
};

const NoData: React.FC<{}> = () => {
  return <div>No data page</div>;
};

const Home: React.FC<{}> = () => {
  return <div>Home page (Cluster listing)</div>;
};

const ClusterOverview: React.FC<{}> = () => {
  return <div>Cluster overview page</div>;
};
