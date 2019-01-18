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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { Link } from 'react-router-dom';
import { LatestMonitorsResult } from 'x-pack/plugins/uptime/common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { getMonitorListQuery } from './get_monitor_list';

interface MonitorListProps {
  filters?: string;
}

type Props = MonitorListProps & UptimeCommonProps;

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
    field: 'ping.monitor.id',
    name: i18n.translate('xpack.uptime.monitorList.idColumnLabel', {
      defaultMessage: 'ID',
    }),
    render: (id: string, monitor: any) => <Link to={`/monitor/${monitor.key.id}`}>{id}</Link>,
  },
  {
    field: 'ping.url.full',
    name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
      defaultMessage: 'URL',
    }),
    render: (url: string, monitor: any) => (
      <EuiLink href={url} target="_blank">
        {url}
      </EuiLink>
    ),
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
  autorefreshIsPaused,
  dateRangeStart,
  dateRangeEnd,
  filters,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
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
