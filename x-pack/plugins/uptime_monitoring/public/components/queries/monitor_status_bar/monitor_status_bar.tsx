/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { Query } from 'react-apollo';
import { createGetMonitorStatusBarQuery } from './get_monitor_status_bar';

interface MonitorStatusBarProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  monitorId: string;
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
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
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const { monitorStatus } = data;
      if (!monitorStatus.length) {
        return `No data found for monitor id ${monitorId}`;
      }
      const { monitor, tcp } = monitorStatus[0];

      return (
        <EuiPanel>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem>Status&#58;</EuiFlexItem>
                <EuiFlexItem>
                  <EuiHealth
                    color={monitor.status === 'up' ? 'success' : 'danger'}
                    style={{ lineHeight: 'inherit' }}
                  >
                    {monitor.status === 'up' ? 'Up' : 'Down'}
                  </EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              Last update: {moment(monitor.timestamp).fromNow()}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>Host: {monitor.host}</EuiFlexItem>
            <EuiFlexItem grow={false}>Port: {tcp.port}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              Duration: {monitor.duration.us / 1000}
              ms
            </EuiFlexItem>
            <EuiFlexItem>Scheme: {monitor.scheme}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }}
  </Query>
);
