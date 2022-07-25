/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import type { HostsTabsProps } from './types';
import { scoreIntervalToDateTime } from '../../common/components/ml/score/score_interval_to_datetime';
import type { Anomaly } from '../../common/components/ml/types';
import { HostsTableType } from '../store/model';
import { AnomaliesQueryTabBody } from '../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesHostTable } from '../../common/components/ml/tables/anomalies_host_table';
import type { UpdateDateRange } from '../../common/components/charts/common';
import { EventsQueryTabBody } from '../../common/components/events_tab';
import { HOSTS_PATH } from '../../../common/constants';

import {
  HostsQueryTabBody,
  HostRiskScoreQueryTabBody,
  UncommonProcessQueryTabBody,
  SessionsTabBody,
} from './navigation';
import { TimelineId } from '../../../common/types';
import { hostNameExistsFilter } from '../../common/components/visualization_actions/utils';

export const HostsTabs = memo<HostsTabsProps>(
  ({
    deleteQuery,
    filterQuery,
    pageFilters = [],
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

    const externalAlertPageFilters = useMemo(
      () => [...hostNameExistsFilter, ...pageFilters],
      [pageFilters]
    );
    return (
      <Switch>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.hosts})`}>
          <HostsQueryTabBody {...tabProps} />
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
          <EventsQueryTabBody
            {...tabProps}
            pageFilters={pageFilters}
            timelineId={TimelineId.hostsPageEvents}
            externalAlertPageFilters={externalAlertPageFilters}
          />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.sessions})`}>
          <SessionsTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';
