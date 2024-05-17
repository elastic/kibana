/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useMemo } from 'react';

import { TableId } from '@kbn/securitysolution-data-table';
import { HOSTS_PATH, SecurityPageName } from '../../../../common/constants';
import { EventsQueryTabBody } from '../../../common/components/events_tab';
import { AnomaliesHostTable } from '../../../common/components/ml/tables/anomalies_host_table';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { HostsTableType } from '../store/model';
import type { HostsTabsProps } from './types';

import { fieldNameExistsFilter } from '../../../common/components/visualization_actions/utils';
import {
  HostRiskScoreQueryTabBody,
  HostsQueryTabBody,
  SessionsTabBody,
  UncommonProcessQueryTabBody,
} from './navigation';

export const HostsTabs = React.memo<HostsTabsProps>(
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

    const hostNameExistsFilter = useMemo(() => fieldNameExistsFilter(SecurityPageName.hosts), []);

    return (
      <Routes>
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
            additionalFilters={hostNameExistsFilter}
            tableId={TableId.hostsPageEvents}
            {...tabProps}
          />
        </Route>
        <Route path={`${HOSTS_PATH}/:tabName(${HostsTableType.sessions})`}>
          <SessionsTabBody {...tabProps} />
        </Route>
      </Routes>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';
