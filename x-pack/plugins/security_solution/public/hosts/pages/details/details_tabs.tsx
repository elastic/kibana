/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UpdateDateRange } from '../../../common/components/charts/common';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../common/components/ml/types';
import { HostsTableType } from '../../store/model';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomaliesHostTable } from '../../../common/components/ml/tables/anomalies_host_table';

import { HostDetailsTabsProps } from './types';
import { type } from './utils';

import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  EventsQueryTabBody,
  HostAlertsQueryTabBody,
} from '../navigation';

export const HostDetailsTabs = React.memo<HostDetailsTabsProps>(
  ({
    docValueFields,
    pageFilters,
    filterQuery,
    detailName,
    setAbsoluteRangeDatePicker,
    indexPattern,
    hostDetailsPagePath,
  }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();
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
      skip: isInitializing,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      hostName: detailName,
      narrowDateRange,
      updateDateRange,
    };

    return (
      <Switch>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.hosts})`}>
          <HostsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>

        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody {...tabProps} pageFilters={pageFilters} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.alerts})`}>
          <HostAlertsQueryTabBody {...tabProps} pageFilters={pageFilters} />
        </Route>
      </Switch>
    );
  }
);

HostDetailsTabs.displayName = 'HostDetailsTabs';
