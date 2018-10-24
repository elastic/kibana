/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, RouteComponentProps, Switch, withRouter } from 'react-router-dom';
import { pure } from 'recompose';

import { HomePage } from './pages/home';

const routes: React.SFC<RouteComponentProps<any>> = ({ match }) => (
  <Switch>
    <Route exact path={`${match.path}`} component={HomePage} />
  </Switch>
);

export const SecOpsRoutes = pure(withRouter(routes));
