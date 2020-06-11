/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { Case } from './pages';

export const CasesRoutes: React.FC = () => (
  <Switch>
    <Route path="/">
      <Case />
    </Route>
  </Switch>
);
