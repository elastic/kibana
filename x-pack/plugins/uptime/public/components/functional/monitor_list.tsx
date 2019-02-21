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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import { LatestMonitor } from '../../../common/graphql/types';
import { formatSparklineCounts } from './format_sparkline_counts';

interface MonitorListProps {
  successColor: string;
  dangerColor: string;
  loading: boolean;
  monitors: LatestMonitor[];
}

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorList = ({ dangerColor, loading, monitors, successColor }: MonitorListProps) => (
  <EuiPanel paddingSize="s">
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage
          id="xpack.uptime.monitorList.monitoringStatusTitle"
          defaultMessage="Monitor status"
        />
      </h5>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiInMemoryTable
      columns={[
        {
          field: 'ping.monitor.status',
          width: 150,
          name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
            defaultMessage: 'Status',
          }),
          render: (status: string, monitor: LatestMonitor) => (
            <div>
              <EuiHealth color={status === 'up' ? 'success' : 'danger'}>
                {status === 'up'
                  ? i18n.translate('xpack.uptime.monitorList.statusColumn.upLabel', {
                      defaultMessage: 'Up',
                    })
                  : i18n.translate('xpack.uptime.monitorList.statusColumn.downLabel', {
                      defaultMessage: 'Down',
                    })}
              </EuiHealth>
              <EuiText size="xs" color="subdued">
                {moment(get(monitor, 'ping.monitor.timestamp', undefined)).fromNow()}
              </EuiText>
            </div>
          ),
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
          render: (url: string, monitor: LatestMonitor) => (
            <div>
              <EuiLink href={url} target="_blank" color="subdued">
                {url}
              </EuiLink>
              {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.ip ? (
                <EuiText size="xs">{monitor.ping.monitor.ip}</EuiText>
              ) : null}
            </div>
          ),
        },
        {
          field: 'upSeries',
          width: 180,
          align: 'right',
          name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
            defaultMessage: 'Downtime history',
          }),
          // @ts-ignore TODO fix typing
          render: (upSeries, monitor) => {
            const { downSeries } = monitor;
            return (
              <EuiSeriesChart
                animateData={false}
                showDefaultAxis={false}
                width={180}
                height={70}
                stackBy="y"
                // TODO: style hack
                style={{ marginBottom: -24 }}
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
);
