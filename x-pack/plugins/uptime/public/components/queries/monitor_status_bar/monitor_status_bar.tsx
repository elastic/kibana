/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloError } from 'apollo-client';
import { get } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { Ping } from 'x-pack/plugins/uptime/common/graphql/types';
import { StatusBar } from '../../functional';
import { EmptyStatusBar } from '../../functional/empty_status_bar';
import { formatDuration } from './format_duration';
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
        return <EmptyStatusBar message="Fetching data" monitorId={monitorId} />;
      }
      if (error) {
        return `Error ${error.message}`;
      }

      const monitorStatus: Ping[] = get(data, 'monitorStatus');
      if (!monitorStatus || !monitorStatus.length) {
        return <EmptyStatusBar monitorId={monitorId} />;
      }
      const { monitor, tcp, timestamp } = monitorStatus[0];
      const status = get(monitor, 'status', undefined);
      const host = get(monitor, 'host', undefined);
      const port = get(tcp, 'port', undefined);
      const duration = parseInt(get(monitor, 'duration.us'), 10);
      const scheme = get(monitor, 'scheme', undefined);

      return (
        <StatusBar
          duration={formatDuration(duration)}
          host={host}
          port={port}
          scheme={scheme}
          status={status}
          timestamp={timestamp}
        />
      );
    }}
  </Query>
);
