/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import type { UsersTabsProps } from './types';
import { UsersTableType } from '../store/model';
import { USERS_PATH } from '../../../../common/constants';
import { AllUsersQueryTabBody, AuthenticationsQueryTabBody } from './navigation';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesUserTable } from '../../../common/components/ml/tables/anomalies_user_table';

import { UserRiskScoreQueryTabBody } from './navigation/user_risk_score_tab_body';
import { EventsQueryTabBody } from '../../../common/components/events_tab';
import { userNameExistsFilter } from './details/helpers';
import { TableId } from '../../../../common/types';

export const UsersTabs = memo<UsersTabsProps>(
  ({ deleteQuery, filterQuery, from, indexNames, isInitializing, setQuery, to, type }) => {
    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      indexNames,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
    };

    return (
      <Switch>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.allUsers})`}>
          <AllUsersQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.authentications})`}>
          <AuthenticationsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesUserTable} />
        </Route>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.risk})`}>
          <UserRiskScoreQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${USERS_PATH}/:tabName(${UsersTableType.events})`}>
          <EventsQueryTabBody
            additionalFilters={userNameExistsFilter}
            tableId={TableId.usersPageEvents}
            {...tabProps}
          />
        </Route>
      </Switch>
    );
  }
);

UsersTabs.displayName = 'UsersTabs';
