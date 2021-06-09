/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { Overview } from './pages';
import { NotFoundPage } from '../app/404';

// TODO: import path from constants file
export const OverviewRoutes = () => (
  <Switch>
    <Route path="/overview" render={() => <Overview />} />
    <Route render={() => <NotFoundPage />} />
  </Switch>
);
