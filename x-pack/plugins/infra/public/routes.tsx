/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from './pages/404';
import { HomePage } from './pages/home';
import { LogsPage } from './pages/logs';

interface RouterProps {
  history: History;
}

export const PageRouter: React.SFC<RouterProps> = ({ history }) => {
  return (
    <Router history={history}>
      <Switch>
        <Redirect from="/" exact={true} to="/home" />
        <Route path="/logs" component={LogsPage} />
        <Route path="/home" component={HomePage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};
