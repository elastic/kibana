/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, RouteComponentProps, Switch, withRouter } from 'react-router-dom';

import { HomePage } from './pages/home';
import { MetricDetail } from './pages/metrics';

const routes: React.SFC<RouteComponentProps<any>> = ({ match }) => {
  return (
    <Switch>
      <Route exact path={`${match.path}`} component={HomePage} />
      <Route path={`${match.path}/metrics/:type/:node`} component={MetricDetail} />
    </Switch>
  );
};

export const InfraOpsRoutes = withRouter(routes);
