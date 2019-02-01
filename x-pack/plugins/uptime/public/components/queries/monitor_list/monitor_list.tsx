/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHealth,
  // @ts-ignore missing type definition
  EuiHistogramSeries,
  // @ts-ignore missing type definition
  EuiInMemoryTable,
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
import { LatestMonitor, LatestMonitorsResult } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { formatSparklineCounts } from './format_sparkline_counts';
import { getMonitorListQuery } from './get_monitor_list';

interface MonitorListProps {
  filters?: string;
}

type Props = MonitorListProps & UptimeCommonProps;

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorList = ({
  autorefreshInterval,
  autorefreshIsPaused,
  colors: { danger, primary },
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
              columns={[
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
                  render: (id: string, monitor: LatestMonitor) => (
                    <Link to={`/monitor/${id}`}>
                      {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.name
                        ? monitor.ping.monitor.name
                        : id}
                    </Link>
                  ),
                },
                {
                  field: 'ping.url.full',
                  name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
                    defaultMessage: 'URL',
                  }),
                  render: (url: string) => (
                    <EuiLink href={url} target="_blank">
                      {url}
                    </EuiLink>
                  ),
                },
                {
                  field: 'ping.monitor.ip',
                  name: i18n.translate('xpack.uptime.monitorList.ipColumnLabel', {
                    defaultMessage: 'IP',
                  }),
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
                        height={70}
                        stackBy="y"
                        // TODO: style hack
                        style={{ marginBottom: '-20px' }}
                        xType={EuiSeriesChartUtils.SCALE.TIME}
                      >
                        <EuiHistogramSeries
                          data={formatSparklineCounts(downSeries)}
                          name={i18n.translate(
                            'xpack.uptime.monitorList.downLineSeries.downLabel',
                            {
                              defaultMessage: 'Down',
                            }
                          )}
                          color={danger}
                        />
                        <EuiHistogramSeries
                          data={formatSparklineCounts(upSeries)}
                          name={i18n.translate('xpack.uptime.monitorList.upLineSeries.upLabel', {
                            defaultMessage: 'Up',
                          })}
                          color={primary}
                        />
                      </EuiSeriesChart>
                    );
                  },
                },
              ]}
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
