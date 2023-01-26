/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import type { HostsTabsProps } from './types';
import { HostsTableType } from '../store/model';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { AnomaliesHostTable } from '../../../common/components/ml/tables/anomalies_host_table';
import { EventsQueryTabBody } from '../../../common/components/events_tab';
import { HOSTS_PATH } from '../../../../common/constants';

import {
  HostsQueryTabBody,
  HostRiskScoreQueryTabBody,
  UncommonProcessQueryTabBody,
  SessionsTabBody,
} from './navigation';
import { TableId } from '../../../../common/types';
import { hostNameExistsFilter } from '../../../common/components/visualization_actions/utils';

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
            additionalFilters={hostNameExistsFilter}
            tableId={TableId.hostsPageEvents}
            {...tabProps}
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
