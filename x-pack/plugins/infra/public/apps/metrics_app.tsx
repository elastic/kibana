/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { History } from 'history';
import { CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters } from '../../../../../src/core/public';
import '../index.scss';
import { NotFoundPage } from '../pages/404';
import { LinkToMetricsPage } from '../pages/link_to/link_to_metrics';
import { InfrastructurePage } from '../pages/metrics';
import { MetricDetail } from '../pages/metrics/metric_detail';
import { InfraClientStartDeps } from '../types';
import { createApolloClient } from '../utils/apollo_client';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  { element, history }: AppMountParameters
) => {
  const apolloClient = createApolloClient(core.http.fetch);

  prepareMountElement(element);

  ReactDOM.render(
    <MetricsApp apolloClient={apolloClient} core={core} history={history} plugins={plugins} />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MetricsApp: React.FC<{
  apolloClient: ApolloClient<{}>;
  core: CoreStart;
  history: History<unknown>;
  plugins: InfraClientStartDeps;
}> = ({ apolloClient, core, history, plugins }) => {
  const uiCapabilities = core.application.capabilities;

  return (
    <CoreProviders core={core} plugins={plugins}>
      <CommonInfraProviders
        apolloClient={apolloClient}
        triggersActionsUI={plugins.triggers_actions_ui}
      >
        <Router history={history}>
          <Switch>
            <Route path="/link-to" component={LinkToMetricsPage} />
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/" exact={true} to="/inventory" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/snapshot" exact={true} to="/inventory" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/metrics-explorer" exact={true} to="/explorer" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="/detail/:type/:node" component={MetricDetail} />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="/" component={InfrastructurePage} />
            )}
            <Route component={NotFoundPage} />
          </Switch>
        </Router>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
