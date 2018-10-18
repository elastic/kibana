/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from './components/404';
import { InfraOpsApp } from './infraops/app';
import { LinkToPage } from './link_to';
import { LogsApp } from './logs/app';

interface RouterProps {
  history: History;
}

export const PageRouter: React.SFC<RouterProps> = ({ history }) => {
  return (
    <Router history={history}>
      <Switch>
        <Redirect from="/" exact={true} to="/infraops" />
        <Route path="/logs" component={LogsApp} />
        <Route path="/infraops" component={InfraOpsApp} />
        <Route path="/link-to" component={LinkToPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};
