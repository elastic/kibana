/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBrowserHistory } from 'history';
import React from 'react';
import { Router, Route, Routes } from 'react-router-dom';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { DefaultLayout } from '../../layouts';

import { DataStreamListPage } from './list_page';

export const DataStreamApp: React.FunctionComponent = () => {
  const history = createBrowserHistory();

  return (
    <Router navigator={history} location={history.location}>
      <Routes>
        <Route path={FLEET_ROUTING_PATHS.data_streams}>
          <DefaultLayout section="data_streams">
            <DataStreamListPage />
          </DefaultLayout>
        </Route>
      </Routes>
    </Router>
  );
};
