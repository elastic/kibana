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
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';

interface MonitorPageProps {
  history: { push: any };
  location: { pathname: string; search: string };
  match: { params: { id: string } };
  // this is the query function provided by Apollo's Client API
  query: <T, TVariables = OperationVariables>(
    options: QueryOptions<TVariables>
  ) => Promise<ApolloQueryResult<T>>;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export const MonitorPage = ({ history, location, query, setBreadcrumbs }: MonitorPageProps) => {
  const [monitorId] = useState<string>(location.pathname.replace(/^(\/monitor\/)/, ''));
  const { colors, refreshApp, setHeadingText } = useContext(UptimeSettingsContext);
  const [params, updateUrlParams] = useUrlParams(history, location);
  const { dateRangeStart, dateRangeEnd, selectedPingStatus } = params;

  useEffect(
    () => {
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
        setBreadcrumbs(getMonitorPageBreadcrumb(heading, stringifyUrlParams(params)));
        if (setHeadingText) {
          setHeadingText(heading);
        }
      });
    },
    [params]
  );
  return (
    <Fragment>
      <MonitorPageTitle monitorId={monitorId} variables={{ monitorId }} />
      <EuiSpacer size="s" />
      <MonitorStatusBar
        monitorId={monitorId}
        variables={{ dateRangeStart, dateRangeEnd, monitorId }}
      />
      <EuiSpacer size="s" />
      <MonitorCharts {...colors} variables={{ dateRangeStart, dateRangeEnd, monitorId }} />
      <EuiSpacer size="s" />
      <PingList
        onSelectedStatusUpdate={(selectedStatus: string | null) =>
          updateUrlParams({ selectedPingStatus: selectedStatus || '' })
        }
        onUpdateApp={refreshApp}
        selectedOption={selectedPingStatus}
        variables={{
          dateRangeStart,
          dateRangeEnd,
          monitorId,
          status: selectedPingStatus,
        }}
      />
    </Fragment>
  );
};
