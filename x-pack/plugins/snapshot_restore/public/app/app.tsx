/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { BASE_PATH } from './constants';
import { RepositoryAdd, RepositoryEdit, SnapshotRestoreHome } from './sections';

export const App = () => {
  return (
    <div>
      <Switch>
        <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}/repositories`} />
        <Route exact path={`${BASE_PATH}/add_repository`} component={RepositoryAdd} />
        <Route exact path={`${BASE_PATH}/edit_repository/:name*`} component={RepositoryEdit} />
        <Route
          exact
          path={`${BASE_PATH}/:section/:repositoryName?/:snapshotId*`}
          component={SnapshotRestoreHome}
        />
      </Switch>
    </div>
  );
};
