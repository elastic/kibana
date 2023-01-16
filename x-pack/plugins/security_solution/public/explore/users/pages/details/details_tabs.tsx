/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { RiskDetailsTabBody } from '../../../components/risk_score/risk_details_tab_body';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { UsersTableType } from '../../store/model';
import { AnomaliesUserTable } from '../../../../common/components/ml/tables/anomalies_user_table';
import type { UsersDetailsTabsProps } from './types';
import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';
import { usersDetailsPagePath } from '../constants';
import { TableId } from '../../../../../common/types';
import { EventsQueryTabBody } from '../../../../common/components/events_tab';
import { AuthenticationsQueryTabBody } from '../navigation';

export const UsersDetailsTabs = React.memo<UsersDetailsTabsProps>(
  ({
    deleteQuery,
    filterQuery,
    from,
    indexNames,
    isInitializing,
    setQuery,
    to,
    type,
    detailName,
    userDetailFilter,
  }) => {
    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      indexNames,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      userName: detailName,
    };

    return (
      <Switch>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.authentications})`}>
          <AuthenticationsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesUserTable} />
        </Route>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.events})`}>
          <EventsQueryTabBody
            additionalFilters={userDetailFilter}
            tableId={TableId.usersPageEvents}
            {...tabProps}
          />
        </Route>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.risk})`}>
          <RiskDetailsTabBody
            {...tabProps}
            riskEntity={RiskScoreEntity.user}
            entityName={tabProps.userName}
          />
        </Route>
      </Switch>
    );
  }
);

UsersDetailsTabs.displayName = 'UsersDetailsTabs';
