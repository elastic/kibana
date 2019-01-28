/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { BASE_PATH } from '../common/constants';
import { IndexList } from './sections/index_list';

export const App = () => (
  <div>
    <Switch>
      <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}indices`}/>
      <Route exact path={`${BASE_PATH}indices`} component={IndexList} />
      <Route path={`${BASE_PATH}indices/filter/:filter?`} component={IndexList}/>
    </Switch>
  </div>
);
