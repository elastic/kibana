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
  EuiPanel,
  // @ts-ignore missing type definition
  EuiSeriesChart,
  // @ts-ignore missing type definition
  EuiSeriesChartUtils,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { LatestMonitor } from '../../../common/graphql/types';
import { formatSparklineCounts } from './format_sparkline_counts';

interface MonitorListProps {
  dangerColor: string;
  loading: boolean;
  monitors: LatestMonitor[];
  primaryColor: string;
}

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorList = ({ dangerColor, loading, monitors, primaryColor }: MonitorListProps) => (
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
          },
          {
            field: 'ping.timestamp',
            name: i18n.translate('xpack.uptime.monitorList.lastUpdatedColumnLabel', {
              defaultMessage: 'Last updated',
            }),
            render: (timestamp: string) => moment(timestamp).fromNow(),
          },
          {
            field: 'ping.monitor.host',
            name: i18n.translate('xpack.uptime.monitorList.hostColumnLabel', {
              defaultMessage: 'Host',
            }),
            render: (host: string, monitor: any) => (
              <Link to={`/monitor/${monitor.key.id}`}>{host || monitor.key.id}</Link>
            ),
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
            name: i18n.translate('xpack.uptime.monitorList.ipColumnLabel', {
              defaultMessage: 'IP',
            }),
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
                  width={180}
                  height={70}
                  stackBy="y"
                  // TODO: style hack
                  style={{ marginBottom: '-20px' }}
                  xType={EuiSeriesChartUtils.SCALE.TIME}
                  xCrosshairFormat="YYYY-MM-DD hh:mmZ"
                >
                  <EuiHistogramSeries
                    data={formatSparklineCounts(downSeries)}
                    name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
                      defaultMessage: 'Down',
                    })}
                    color={dangerColor}
                  />
                  <EuiHistogramSeries
                    data={formatSparklineCounts(upSeries)}
                    name={i18n.translate('xpack.uptime.monitorList.upLineSeries.upLabel', {
                      defaultMessage: 'Up',
                    })}
                    color={primaryColor}
                  />
                </EuiSeriesChart>
              );
            },
          },
        ]}
        loading={loading}
        items={monitors}
        pagination={monitorListPagination}
      />
    </EuiPanel>
  </Fragment>
);
