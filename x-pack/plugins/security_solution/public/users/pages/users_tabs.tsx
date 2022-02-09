/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UsersTabsProps } from './types';
import { UsersTableType } from '../store/model';
import { USERS_PATH } from '../../../common/constants';
import { AllUsersQueryTabBody } from './navigation';

export const UsersTabs = memo<UsersTabsProps>(
  ({
    deleteQuery,
    docValueFields,
    filterQuery,
    from,
    indexNames,
    isInitializing,
    setQuery,
    to,
    type,
  }) => {
    return (
      <Switch>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.allUsers})`}>
          <AllUsersQueryTabBody
            deleteQuery={deleteQuery}
            endDate={to}
            filterQuery={filterQuery}
            indexNames={indexNames}
            skip={isInitializing || filterQuery === undefined}
            setQuery={setQuery}
            startDate={from}
            type={type}
            docValueFields={docValueFields}
          />
        </Route>
      </Switch>
    );
  }
);

UsersTabs.displayName = 'UsersTabs';
