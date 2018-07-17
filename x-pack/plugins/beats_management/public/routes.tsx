/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import { NotFoundPage } from './pages/404';
import { HomePage } from './pages/home';

export const PageRouter: React.SFC<{}> = () => {
  return (
    <HashRouter basename="/management/beats_management">
      <Switch>
        <Route path="/" exact={true} component={HomePage} />
        <Route component={NotFoundPage} />
      </Switch>
    </HashRouter>
  );
};
