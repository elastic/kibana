/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHealth,
  // @ts-ignore missing type definition
  EuiInMemoryTable,
  // @ts-ignore missing type definition
  EuiLineSeries,
  EuiLink,
  EuiPanel,
  // @ts-ignore missing type definition
  EuiSeriesChart,
  // @ts-ignore missing type definition
  EuiSeriesChartUtils,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { Link } from 'react-router-dom';
import { getMonitorListQuery } from './get_monitor_list';

interface MonitorListProps {
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
  dateRangeStart: number;
  dateRangeEnd: number;
  filters?: string;
}

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListColumns = [
  {
    field: 'ping.monitor.status',
    name: 'Status',
    render: (status: string) => (
      <EuiHealth color={status === 'up' ? 'success' : 'danger'}>
        {status === 'up' ? 'Up' : 'Down'}
      </EuiHealth>
    ),
    sortable: true,
  },
  {
    field: 'ping.timestamp',
    name: 'Last updated',
    render: (timestamp: string) => moment(timestamp).fromNow(),
    sortable: true,
  },
  {
    field: 'ping.monitor.id',
    name: 'ID',
    render: (id: string, monitor: any) => <Link to={`/monitor/${monitor.key.id}`}>{id}</Link>,
  },
  {
    field: 'ping.url.full',
    name: 'URL',
    sortable: true,
    render: (url: string) => (
      <EuiLink href={url} rel="noopener" target="_blank">
        {url}
      </EuiLink>
    ),
  },
  {
    field: 'ping.monitor.ip',
    name: 'IP',
    sortable: true,
  },
  {
    field: 'upSeries',
    name: 'Monitor History',
    // @ts-ignore TODO fix typing
    render: (upSeries, monitor) => {
      const { downSeries } = monitor;
      return (
        <EuiSeriesChart
          showDefaultAxis={false}
          width={160}
          height={70}
          xType={EuiSeriesChartUtils.SCALE.TIME}
        >
          <EuiLineSeries
            lineSize={2}
            color="green"
            name="Up"
            data={upSeries}
            showLineMarks={true}
          />
          <EuiLineSeries
            lineSize={2}
            color="red"
            name="Down"
            data={downSeries}
            showLineMarks={true}
          />
        </EuiSeriesChart>
      );
    },
  },
];

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorList = ({
  autorefreshInterval,
  autorefreshEnabled,
  dateRangeStart,
  dateRangeEnd,
  filters,
}: MonitorListProps) => (
  <Query
    pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
    query={getMonitorListQuery}
    variables={{ dateRangeStart, dateRangeEnd, filters }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const {
        monitorStatus: { monitors },
      } = data;
      return (
        <Fragment>
          <EuiTitle size="xs">
            <h5>Monitor status</h5>
          </EuiTitle>
          <EuiPanel paddingSize="l">
            <EuiInMemoryTable
              columns={monitorListColumns}
              items={monitors}
              pagination={monitorListPagination}
              sorting={true}
            />
          </EuiPanel>
        </Fragment>
      );
    }}
  </Query>
);
