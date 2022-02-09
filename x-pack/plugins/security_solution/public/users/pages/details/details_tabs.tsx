/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { UsersTableType } from '../../store/model';
import { useGlobalTime } from '../../../common/containers/use_global_time';

import { UsersDetailsTabsProps } from './types';
import { type } from './utils';

import { AllUsersQueryTabBody } from '../navigation';

export const UsersDetailsTabs = React.memo<UsersDetailsTabsProps>(
  ({ docValueFields, filterQuery, indexNames, usersDetailsPagePath }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();

    return (
      <Switch>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.allUsers})`}>
          <AllUsersQueryTabBody
            deleteQuery={deleteQuery}
            endDate={to}
            filterQuery={filterQuery}
            skip={isInitializing || filterQuery === undefined}
            setQuery={setQuery}
            startDate={from}
            type={type}
            indexNames={indexNames}
            docValueFields={docValueFields}
          />
        </Route>
      </Switch>
    );
  }
);

UsersDetailsTabs.displayName = 'UsersDetailsTabs';
