/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { AgentConfigListPage } from './list_page';

export const AgentConfigApp: React.FunctionComponent = () => (
  <Router>
    <Switch>
      <Route path="/">
        <AgentConfigListPage />
      </Route>
    </Switch>
  </Router>
);
