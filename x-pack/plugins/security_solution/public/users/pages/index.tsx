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
import { UsersDetails } from './details';
import { usersDetailsPagePath, usersDetailsTabPath, usersTabPath } from './constants';

export const UsersContainer = React.memo(() => {
  return (
    <Switch>
      <Route path={usersTabPath}>
        <Users />
      </Route>

      <Route
        path={usersDetailsTabPath}
        render={({
          match: {
            params: { detailName },
          },
        }) => (
          <UsersDetails
            usersDetailsPagePath={usersDetailsPagePath}
            detailName={decodeURIComponent(detailName)}
          />
        )}
      />
      <Route
        path={usersDetailsPagePath}
        render={({
          match: {
            params: { detailName },
          },
          location: { search = '' },
        }) => (
          <Redirect
            to={{
              pathname: `${USERS_PATH}/${detailName}/${UsersTableType.authentications}`,
              search,
            }}
          />
        )}
      />
      <Route
        path={USERS_PATH}
        render={({ location: { search = '' } }) => (
          <Redirect to={{ pathname: `${USERS_PATH}/${UsersTableType.allUsers}`, search }} />
        )}
      />
    </Switch>
  );
});

UsersContainer.displayName = 'UsersContainer';
