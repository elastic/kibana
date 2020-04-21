/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from '../pages/404';
import { InfrastructurePage } from '../pages/metrics';
import { MetricDetail } from '../pages/metrics/metric_detail';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { AppRouter } from './index';
import { LinkToMetricsPage } from '../pages/link_to';

export const MetricsRouter: AppRouter = ({ history }) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
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
        {uiCapabilities?.infrastructure?.show && <Route path="/" component={InfrastructurePage} />}
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};
