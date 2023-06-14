/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, useHistory } from 'react-router-dom';
import { CompatRouter } from 'react-rotuer-dom-v5-compat';
import { Route } from '@kbn/shared-ux-router';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { DefaultLayout } from '../../layouts';

import { DataStreamListPage } from './list_page';

export const DataStreamApp: React.FunctionComponent = () => {
  const history = useHistory();

  return (
    <Router history={history}>
      <CompatRouter>
        <Switch>
          <Route path={FLEET_ROUTING_PATHS.data_streams}>
            <DefaultLayout section="data_streams">
              <DataStreamListPage />
            </DefaultLayout>
          </Route>
        </Switch>
      </CompatRouter>
    </Router>
  );
};
