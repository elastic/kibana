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
  EuiPanel,
  // @ts-ignore missing type definition
  EuiSeriesChart,
  // @ts-ignore missing type definition
  EuiSeriesChartUtils,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { Link } from 'react-router-dom';
import { LatestMonitorsResult } from 'x-pack/plugins/uptime/common/graphql/types';
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
    name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
      defaultMessage: 'Status',
    }),
    render: (status: string) => (
      <EuiHealth color={status === 'up' ? 'success' : 'danger'}>
        {status === 'up'
          ? i18n.translate('xpack.uptime.monitorList.statusColumn.upLabel', {
              defaultMessage: 'Up',
            })
          : i18n.translate('xpack.uptime.monitorList.statusColumn.downLabel', {
              defaultMessage: 'Down',
            })}
      </EuiHealth>
    ),
    sortable: true,
  },
  {
    field: 'ping.timestamp',
    name: i18n.translate('xpack.uptime.monitorList.lastUpdatedColumnLabel', {
      defaultMessage: 'Last updated',
    }),
    render: (timestamp: string) => moment(timestamp).fromNow(),
    sortable: true,
  },
  {
    field: 'ping.monitor.host',
    name: i18n.translate('xpack.uptime.monitorList.hostColumnLabel', {
      defaultMessage: 'Host',
    }),
    render: (host: string, monitor: any) => <Link to={`/monitor/${monitor.key.id}`}>{host}</Link>,
  },
  {
    field: 'key.port',
    name: i18n.translate('xpack.uptime.monitorList.portColumnLabel', {
      defaultMessage: 'Port',
    }),
    sortable: true,
  },
  {
    field: 'ping.monitor.type',
    name: i18n.translate('xpack.uptime.monitorList.typeColumnLabel', {
      defaultMessage: 'Type',
    }),
    sortable: true,
  },
  {
    field: 'ping.monitor.ip',
    name: i18n.translate('xpack.uptime.monitorList.ipColumnLabel', { defaultMessage: 'IP' }),
    sortable: true,
  },
  {
    field: 'upSeries',
    name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
      defaultMessage: 'Monitor History',
    }),
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
            name={i18n.translate('xpack.uptime.monitorList.upLineSeries.upLabel', {
              defaultMessage: 'Up',
            })}
            data={upSeries}
            showLineMarks={true}
          />
          <EuiLineSeries
            lineSize={2}
            color="red"
            name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
              defaultMessage: 'Down',
            })}
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
      if (error) {
        return i18n.translate('xpack.uptime.monitorList.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const monitors: LatestMonitorsResult | undefined = get(data, 'monitorStatus.monitors');
      // TODO: add a better loading message than "no items found", which it displays today
      return (
        <Fragment>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.uptime.monitorList.monitoringStatusTitle"
                defaultMessage="Monitor status"
              />
            </h5>
          </EuiTitle>
          <EuiPanel paddingSize="l">
            <EuiInMemoryTable
              columns={monitorListColumns}
              loading={loading}
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
