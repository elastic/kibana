/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskDetailsTabBody } from '../../../components/risk_score/risk_details_tab_body';
import { HostsTableType } from '../../store/model';
import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { AnomaliesHostTable } from '../../../../common/components/ml/tables/anomalies_host_table';
import { EventsQueryTabBody } from '../../../../common/components/events_tab';

import type { HostDetailsTabsProps } from './types';
import { type } from './utils';

import {
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  SessionsTabBody,
} from '../navigation';
import { TableId } from '../../../../../common/types';

export const HostDetailsTabs = React.memo<HostDetailsTabsProps>(
  ({
    detailName,
    filterQuery,
    indexNames,
    indexPattern,
    hostDetailsPagePath,
    hostDetailsFilter,
  }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();

    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      indexNames,
      hostName: detailName,
    };

    return (
      <Switch>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>

        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody
            additionalFilters={hostDetailsFilter}
            tableId={TableId.hostsPageEvents}
            {...tabProps}
          />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.risk})`}>
          <RiskDetailsTabBody
            {...tabProps}
            riskEntity={RiskScoreEntity.host}
            entityName={tabProps.hostName}
          />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.sessions})`}>
          <SessionsTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

HostDetailsTabs.displayName = 'HostDetailsTabs';
