/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { USERS_PATH } from '../../../common/constants';
import { UsersTableType } from '../store/model';
import { Users } from './users';

const usersTabPath = `${USERS_PATH}/:tabName(${UsersTableType.riskScore})`;

export const UsersContainer = React.memo(() => (
  <Switch>
    <Route
      exact
      strict
      path={USERS_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={{ pathname: `${USERS_PATH}/${UsersTableType.riskScore}`, search }} />
      )}
    />

    <Route path={usersTabPath}>
      <Users />
    </Route>
  </Switch>
));

UsersContainer.displayName = 'UsersContainer';
