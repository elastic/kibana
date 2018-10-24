/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { NotFoundPage } from '../components/404';
import { LogsPage } from './pages/logs';

export const LogsRoutes: React.SFC = () => (
  <Switch>
    <Redirect from="/" exact={true} to={`infraops/home`} />
    <Route path="/logs" component={LogsPage} />
    <Route component={NotFoundPage} />
  </Switch>
);
