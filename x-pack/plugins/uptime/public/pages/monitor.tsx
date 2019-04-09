/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore No typings for EuiSpacer
  EuiSpacer,
  // @ts-ignore No typings for EuiSuperSelect
  EuiSuperSelect,
} from '@elastic/eui';
import { ApolloQueryResult, OperationVariables, QueryOptions } from 'apollo-client';
import gql from 'graphql-tag';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import {
  MonitorCharts,
  MonitorPageTitle,
  MonitorStatusBar,
  PingList,
} from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeContext } from '../uptime_context';

interface MonitorPageProps {
  history: { push: any };
  location: { pathname: string };
  match: { params: { id: string } };
  // this is the query function provided by Apollo's Client API
  query: <T, TVariables = OperationVariables>(
    options: QueryOptions<TVariables>
  ) => Promise<ApolloQueryResult<T>>;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export const MonitorPage = ({ location, query, setBreadcrumbs }: MonitorPageProps) => {
  const [monitorId] = useState<string>(location.pathname.replace(/^(\/monitor\/)/, ''));
  const [selectedStatus, setSelectedStatus] = useState<string | null>('down');
  const {
    colors,
    dateRangeStart,
    dateRangeEnd,
    lastRefresh,
    refreshApp,
    setHeadingText,
  } = useContext(UptimeContext);
  useEffect(() => {
    query({
      query: gql`
        query MonitorPageTitle($monitorId: String!) {
          monitorPageTitle: getMonitorPageTitle(monitorId: $monitorId) {
            id
            url
            name
          }
        }
      `,
      variables: { monitorId },
    }).then((result: any) => {
      const { name, url, id } = result.data.monitorPageTitle;
      const heading: string = name || url || id;
      setBreadcrumbs(getMonitorPageBreadcrumb(heading));
      if (setHeadingText) {
        setHeadingText(heading);
      }
    });
  }, []);
  return (
    <Fragment>
      <MonitorPageTitle lastRefresh={lastRefresh} monitorId={monitorId} variables={{ monitorId }} />
      <EuiSpacer size="s" />
      <MonitorStatusBar
        lastRefresh={lastRefresh}
        monitorId={monitorId}
        variables={{ dateRangeStart, dateRangeEnd, monitorId }}
      />
      <EuiSpacer size="s" />
      <MonitorCharts
        {...colors}
        lastRefresh={lastRefresh}
        variables={{ dateRangeStart, dateRangeEnd, monitorId }}
      />
      <EuiSpacer size="s" />
      <PingList
        lastRefresh={lastRefresh}
        onSelectedStatusUpdate={setSelectedStatus}
        onUpdateApp={refreshApp}
        variables={{
          dateRangeStart,
          dateRangeEnd,
          monitorId,
          status: selectedStatus,
        }}
      />
    </Fragment>
  );
};
