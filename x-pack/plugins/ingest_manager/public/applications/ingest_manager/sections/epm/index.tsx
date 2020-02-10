/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';

import { Home } from './screens/home';
import { Detail } from './screens/detail';

export const EPMApp: React.FC = () => (
  <Router>
    <Switch>
      <Route path="/detail/:pkgkey/:panel?">
        <Detail />
      </Route>
      <Route path="/">
        <Home />
      </Route>
    </Switch>
  </Router>
);
