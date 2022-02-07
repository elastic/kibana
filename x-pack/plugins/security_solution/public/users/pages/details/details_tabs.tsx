/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UpdateDateRange } from '../../../common/components/charts/common';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../common/components/ml/types';
import { UsersTableType } from '../../store/model';
import { useGlobalTime } from '../../../common/containers/use_global_time';

import { UsersDetailsTabsProps } from './types';
import { type } from './utils';

import { AllUsersQueryTabBody } from '../navigation';
import { AllUsersQueryProps } from '../navigation/types';

export const UsersDetailsTabs = React.memo<UsersDetailsTabsProps>(
  ({ docValueFields, filterQuery, indexNames, usersDetailsPagePath }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();

    const tabProps: AllUsersQueryProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      indexNames,
      docValueFields,
    };

    return (
      <Switch>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.allUsers})`}>
          <AllUsersQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

UsersDetailsTabs.displayName = 'UsersDetailsTabs';
