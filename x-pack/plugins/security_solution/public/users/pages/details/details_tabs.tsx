/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UsersTableType } from '../../store/model';
import { AnomaliesUserTable } from '../../../common/components/ml/tables/anomalies_user_table';
import { UsersDetailsTabsProps } from './types';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { Anomaly } from '../../../common/components/ml/types';
import { usersDetailsPagePath } from '../constants';
import { TimelineId } from '../../../../common/types';
import { EventsQueryTabBody } from '../../../common/components/events_tab/events_query_tab_body';
import { AlertsView } from '../../../common/components/alerts_viewer';
import { userNameExistsFilter } from './helpers';

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
    setAbsoluteRangeDatePicker,
    detailName,
    pageFilters,
  }) => {
    const narrowDateRange = useCallback(
      (score: Anomaly, interval: string) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      [setAbsoluteRangeDatePicker]
    );

    const updateDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        });
      },
      [setAbsoluteRangeDatePicker]
    );

    const alertsPageFilters = useMemo(
      () =>
        pageFilters != null ? [...userNameExistsFilter, ...pageFilters] : userNameExistsFilter,
      [pageFilters]
    );

    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      indexNames,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      narrowDateRange,
      updateDateRange,
      userName: detailName,
    };

    return (
      <Switch>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesUserTable} />
        </Route>
        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.events})`}>
          <EventsQueryTabBody
            {...tabProps}
            pageFilters={pageFilters}
            timelineId={TimelineId.usersPageEvents}
          />
        </Route>

        <Route path={`${usersDetailsPagePath}/:tabName(${UsersTableType.alerts})`}>
          <AlertsView
            entityType="events"
            timelineId={TimelineId.usersPageExternalAlerts}
            pageFilters={alertsPageFilters}
            {...tabProps}
          />
        </Route>
      </Switch>
    );
  }
);

UsersDetailsTabs.displayName = 'UsersDetailsTabs';
