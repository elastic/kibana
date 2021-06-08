/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import { FLEET_ROUTING_PATHS } from '../../constants';

import { DataStreamListPage } from './list_page';

export const DataStreamApp: React.FunctionComponent = () => {
  return (
    <Router>
      <Switch>
        <Route path={FLEET_ROUTING_PATHS.data_streams}>
          <DataStreamListPage />
        </Route>
      </Switch>
    </Router>
  );
};
