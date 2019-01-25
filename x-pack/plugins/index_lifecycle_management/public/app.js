/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
import { EditPolicy } from './sections/edit_policy';
import { PolicyTable } from './sections/policy_table';
import { BASE_PATH } from '../common/constants';

export const App = () => (
  <HashRouter>
    <Switch>
      <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}policies`}/>
      <Route exact path={`${BASE_PATH}policies`} component={PolicyTable}/>
      <Route path={`${BASE_PATH}policies/edit/:policyName?`} component={EditPolicy}/>
    </Switch>
  </HashRouter>
);
