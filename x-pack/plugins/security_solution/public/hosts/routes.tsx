/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { HostsContainer } from './pages';
import { NotFoundPage } from '../app/404';

export const HostsRoutes = () => (
  <Switch>
    <Route path="/" render={({ match }) => <HostsContainer url={match.url} />} />
    <Route render={() => <NotFoundPage />} />
  </Switch>
);
