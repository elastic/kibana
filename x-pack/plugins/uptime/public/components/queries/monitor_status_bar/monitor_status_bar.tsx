/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import { ApolloError } from 'apollo-client';
import { get } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Query } from 'react-apollo';
import { Ping } from 'x-pack/plugins/uptime/common/graphql/types';
import { createGetMonitorStatusBarQuery } from './get_monitor_status_bar';

interface MonitorStatusBarProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  monitorId: string;
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
}

interface MonitorStatusBarQueryParams {
  loading: boolean;
  error?: ApolloError | any;
  data?: { monitorStatus: Ping[] };
}

export const MonitorStatusBar = ({
  dateRangeStart,
  dateRangeEnd,
  monitorId,
  autorefreshEnabled,
  autorefreshInterval,
}: MonitorStatusBarProps) => (
  <Query
    pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
    query={createGetMonitorStatusBarQuery}
    variables={{ dateRangeStart, dateRangeEnd, monitorId }}
  >
    {({ loading, error, data }: MonitorStatusBarQueryParams) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }

      const monitorStatus: Ping[] = get(data, 'monitorStatus');
      if (!monitorStatus || !monitorStatus.length) {
        return `No data found for monitor id ${monitorId}`;
      }
      const { monitor, tcp, timestamp } = monitorStatus[0];
      const status = get(monitor, 'status');
      const host = get(monitor, 'host');
      const port = get(tcp, 'port');
      const duration = parseInt(get(monitor, 'duration.us'), 10);
      const scheme = get(monitor, 'scheme');

      return (
        <EuiPanel>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem>Status&#58;</EuiFlexItem>
                <EuiFlexItem>
                  <EuiHealth
                    color={status === 'up' ? 'success' : 'danger'}
                    style={{ lineHeight: 'inherit' }}
                  >
                    {status === 'up' ? 'Up' : 'Down'}
                  </EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>Last update: {moment(timestamp).fromNow()}</EuiFlexItem>
            <EuiFlexItem grow={false}>Host: {host}</EuiFlexItem>
            <EuiFlexItem grow={false}>Port: {port}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              Duration: {isNaN(duration) ? 'N/A' : duration / 1000}
              ms
            </EuiFlexItem>
            <EuiFlexItem>Scheme: {scheme}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }}
  </Query>
);
