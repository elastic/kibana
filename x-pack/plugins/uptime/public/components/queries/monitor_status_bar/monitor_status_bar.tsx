/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { createGetMonitorStatusBarQuery } from './get_monitor_status_bar';

interface MonitorStatusBarProps {
  monitorId: string;
}

type Props = MonitorStatusBarProps & UptimeCommonProps;

export const MonitorStatusBar = ({
  dateRangeStart,
  dateRangeEnd,
  monitorId,
  autorefreshIsPaused,
  autorefreshInterval,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
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
          defaultMessage: 'Error {message}',
        });
      }
      const { monitorStatus } = data;
      if (!monitorStatus.length) {
        return i18n.translate('xpack.uptime.monitorStatusBar.noDataMessage', {
          values: { monitorId },
          defaultMessage: 'No data found for monitor id {monitorId}',
        });
      }
      const {
        monitor: {
          status,
          timestamp,
          ip,
          duration: { us },
        },
        url: { full: fullURL },
      } = monitorStatus[0];

      return (
        <EuiPanel>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.uptime.monitorStatusBar.statusLabel"
                    defaultMessage="Status:"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiHealth
                    color={status === 'up' ? 'success' : 'danger'}
                    style={{ lineHeight: 'inherit' }}
                  >
                    {status === 'up'
                      ? i18n.translate(
                          'xpack.uptime.monitorStatusBar.healthStatusMessage.upLabel',
                          { defaultMessage: 'Up' }
                        )
                      : i18n.translate(
                          'xpack.uptime.monitorStatusBar.healthStatusMessage.downLabel',
                          { defaultMessage: 'Down' }
                        )}
                  </EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatus.lastUpdateMessage"
                values={{ timeFromNow: moment(timestamp).fromNow() }}
                defaultMessage="Last update: {timeFromNow}"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={fullURL} target="_blank">
                {fullURL}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatus.ipMessage"
                // TODO: this should not be computed inline
                values={{ ip }}
                defaultMessage="IP: {ip}"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatus.durationInMillisecondsMessage"
                // TODO: this should not be computed inline
                values={{ duration: us / 1000 }}
                defaultMessage="Duration: {duration} ms"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }}
  </Query>
);
