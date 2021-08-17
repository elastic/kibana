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
// import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { PageLoading } from '../components';
import { MonitoringStartPluginDependencies } from '../types';

export const renderApp = (
  core: CoreStart,
  plugins: MonitoringStartPluginDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<MonitoringApp core={core} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MonitoringApp: React.FC<{
  core: CoreStart;
}> = ({ core }) => {
  return (
    <core.i18n.Context>
      <HashRouter>
        <Switch>
          <Route path="/loading" component={Loading} />
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
    </core.i18n.Context>
  );
};

const Loading: React.FC<{}> = () => {
  return <PageLoading />;
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
