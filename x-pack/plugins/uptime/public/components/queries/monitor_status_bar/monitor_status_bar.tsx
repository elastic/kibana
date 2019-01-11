/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
        return i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.monitorStatusBar.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {error.message}',
        });
      }
      const { monitorStatus } = data;
      if (!monitorStatus.length) {
        return i18n.translate('xpack.uptime.monitorStatusBar.noDataMessage', {
          values: { monitorId },
          defaultMessage: 'No data found for monitor id {monitorId}',
        });
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
                    <FormattedMessage
                      id="xpack.uptime.monitorStatusBar.healthStatusMessage"
                      values={{ status: monitor.status === 'up' ? 'Up' : 'Down' }}
                      defaultMessage="{status}"
                    />
                  </EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatusMessage"
                values={{ timeFromNow: moment(monitor.timestamp).fromNow() }}
                defaultMessage="Last update: {timeFromNow}"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatusHostMessage"
                values={{ hostname: monitor.host }}
                defaultMessage="Host: {hostname}"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatusPortMessage"
                values={{ port: tcp.port }}
                defaultMessage="Port: {port}"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.durationMilliseconds"
                // TODO: this should not be computed inline
                values={{ duration: monitor.duration.us / 1000 }}
                defaultMessage="Duration: {duration} ms"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.scheme"
                values={{ scheme: monitor.scheme }}
                defaultMessage="Scheme: {scheme}"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }}
  </Query>
);
