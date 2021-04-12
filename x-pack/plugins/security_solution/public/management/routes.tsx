/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { ManagementContainer } from './pages';
import { NotFoundPage } from '../app/404';
import { CurrentLicense } from '../common/components/current_license';

/**
 * Returns the React Router Routes for the management area
 */
export const ManagementRoutes = () => (
  <CurrentLicense>
    <Switch>
      <Route path="/" component={ManagementContainer} />
      <Route render={() => <NotFoundPage />} />
    </Switch>
  </CurrentLicense>
);
