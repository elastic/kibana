/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { BASE_PATH } from '../../common/constants';

import { ClusterList } from './sections/cluster';

const MyComp = () => (
  <div>
    <div>Cross Clusters Replication APP</div>
    <ClusterList />
  </div>
);

export const App = () => (
  <div>
    <Switch>
      <Route path={BASE_PATH} component={MyComp} />
    </Switch>
  </div>
);
