/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ApolloError } from 'apollo-client';
import { get } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { Ping } from 'x-pack/plugins/uptime/common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { EmptyStatusBar, MonitorStatusBar } from '../../functional';
import { formatDuration } from './format_duration';
import { getMonitorStatusBarQuery } from './get_monitor_status_bar';

interface MonitorStatusBarProps {
  monitorId: string;
}

interface MonitorStatusBarQueryParams {
  loading: boolean;
  error?: ApolloError | any;
  data?: { monitorStatus: Ping[] };
}

type Props = MonitorStatusBarProps & UptimeCommonProps;

export const MonitorStatusBarQuery = ({
  dateRangeStart,
  dateRangeEnd,
  monitorId,
  autorefreshIsPaused,
  autorefreshInterval,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getMonitorStatusBarQuery}
    variables={{ dateRangeStart, dateRangeEnd, monitorId }}
  >
    {({ loading, error, data }: MonitorStatusBarQueryParams) => {
      if (loading) {
        return (
          <EmptyStatusBar
            message={i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
              defaultMessage: 'Loading…',
            })}
            monitorId={monitorId}
          />
        );
      }
      if (error) {
        return i18n.translate('xpack.uptime.monitorStatusBar.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }

      const monitorStatus: Ping[] = get(data, 'monitorStatus');
      if (!monitorStatus || !monitorStatus.length) {
        return <EmptyStatusBar monitorId={monitorId} />;
      }
      const { monitor, timestamp, url } = monitorStatus[0];
      const status = get(monitor, 'status', undefined);
      const duration = parseInt(get(monitor, 'duration.us'), 10);
      const full = get(url, 'full', undefined);

      return (
        <MonitorStatusBar
          duration={formatDuration(duration)}
          status={status}
          timestamp={timestamp}
          url={full}
        />
      );
    }}
  </Query>
);
