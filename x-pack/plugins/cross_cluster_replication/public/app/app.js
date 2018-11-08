/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { BASE_PATH } from '../../common/constants';

import { AutoFollowPatternList } from './sections/auto_follow_pattern';

const MyComp = () => (
  <div>
    <h1>Cross Clusters Replication APP</h1>
    <AutoFollowPatternList />
  </div>
);

export const App = () => (
  <div>
    <Switch>
      <Route path={BASE_PATH} component={MyComp} />
    </Switch>
  </div>
);
