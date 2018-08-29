/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';
import { Wizard } from './sections/wizard';
import { PolicyTable } from './sections/policy_table';
import { BASE_PATH } from '../common/constants';

export const App = () => (
  <HashRouter>
    <Switch>
      <Route path={`${BASE_PATH}wizard`} component={Wizard}/>
      <Route path={`${BASE_PATH}policies`} component={PolicyTable}/>
    </Switch>
  </HashRouter>
);
