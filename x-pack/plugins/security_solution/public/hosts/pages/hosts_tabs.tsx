/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  EventsQueryTabBody,
} from './navigation';
import { HostAlertsQueryTabBody } from './navigation/alerts_query_tab_body';

export const HostsTabs = memo<HostsTabsProps>(
  ({
    deleteQuery,
    docValueFields,
    filterQuery,
    setAbsoluteRangeDatePicker,
    to,
    from,
    setQuery,
    isInitializing,
    type,
    indexPattern,
    hostsPagePath,
  }) => {
    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      narrowDateRange: useCallback(
        (score: Anomaly, interval: string) => {
          const fromTo = scoreIntervalToDateTime(score, interval);
          setAbsoluteRangeDatePicker({
            id: 'global',
            from: fromTo.from,
            to: fromTo.to,
          });
        },
        [setAbsoluteRangeDatePicker]
      ),
      updateDateRange: useCallback<UpdateDateRange>(
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
      ),
    };

    return (
      <Switch>
        <Route path={`/:tabName(${HostsTableType.hosts})`}>
          <HostsQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
        <Route path={`/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
        <Route path={`/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>
        <Route path={`/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`/:tabName(${HostsTableType.alerts})`}>
          <HostAlertsQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';
