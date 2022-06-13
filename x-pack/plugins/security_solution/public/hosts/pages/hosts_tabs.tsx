/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { HostsTabsProps } from './types';
import { scoreIntervalToDateTime } from '../../common/components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../common/components/ml/types';
import { HostsTableType } from '../store/model';
import { AnomaliesQueryTabBody } from '../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesHostTable } from '../../common/components/ml/tables/anomalies_host_table';
import { UpdateDateRange } from '../../common/components/charts/common';
import { EventsQueryTabBody } from '../../common/components/events_tab/events_query_tab_body';
import { HOSTS_PATH } from '../../../common/constants';

import {
  HostsQueryTabBody,
  HostRiskScoreQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  SessionsTabBody,
} from './navigation';
import { HostAlertsQueryTabBody } from './navigation/alerts_query_tab_body';
import { TimelineId } from '../../../common/types';

export const HostsTabs = memo<HostsTabsProps>(
  ({
    deleteQuery,
    docValueFields,
    filterQuery,
    from,
    indexNames,
    isInitializing,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
    type,
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
    };

    return (
      <Switch>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.hosts})`}>
          <HostsQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.risk})`}>
          <HostRiskScoreQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody {...tabProps} timelineId={TimelineId.hostsPageEvents} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.alerts})`}>
          <HostAlertsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.sessions})`}>
          <SessionsTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';
