/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHealth,
  // @ts-ignore missing type definition
  EuiHistogramSeries,
  EuiIcon,
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
import { LatestMonitor, MonitorSeriesPoint, Ping } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorListQuery } from '../../queries';
import { MonitorSparkline } from './monitor_sparkline';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';

interface MonitorListQueryResult {
  // TODO: clean up this ugly result data shape, there should be no nesting
  monitorStatus?: {
    monitors: LatestMonitor[];
  };
}

interface MonitorListProps {
  basePath: string;
  dangerColor: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  linkParameters?: string;
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorListComponent = ({
  basePath,
  dangerColor,
  dateRangeStart,
  dateRangeEnd,
  data,
  linkParameters,
  loading,
}: Props) => {
  return (
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
            width: '150px',
            name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
              defaultMessage: 'Status',
            }),
            render: (status: string, monitor: LatestMonitor) => (
              <div>
                <EuiHealth
                  color={status === 'up' ? 'success' : 'danger'}
                  style={{ display: 'block' }}
                >
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
              <EuiLink>
                <Link
                  data-test-subj={`monitor-page-link-${id}`}
                  to={`/monitor/${id}${linkParameters}`}
                >
                  {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.name
                    ? monitor.ping.monitor.name
                    : id}
                </Link>
              </EuiLink>
            ),
          },
          {
            field: 'ping.url.full',
            name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
              defaultMessage: 'URL',
            }),
            render: (url: string, monitor: LatestMonitor) => (
              <div>
                <EuiLink href={url} target="_blank" color="text">
                  {url} <EuiIcon size="s" type="popout" color="subdued" />
                </EuiLink>
              </div>
            ),
          },
          {
            field: 'ping.url.full',
            name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
              defaultMessage: 'URL',
            }),
            render: (url: string, monitor: LatestMonitor) => (
              <div>
                <EuiLink href={url} target="_blank" color="text">
                  {url} <EuiIcon size="s" type="popout" color="subdued" />
                </EuiLink>
                {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.ip ? (
                  <EuiText size="xs" color="subdued">
                    {monitor.ping.monitor.ip}
                  </EuiText>
                ) : null}
              </div>
            ),
          },
          {
            field: 'upSeries',
            width: '180px',
            align: 'right',
            name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
              defaultMessage: 'Downtime history',
            }),
            render: (downSeries: MonitorSeriesPoint, monitor: LatestMonitor) => (
              <MonitorSparkline dangerColor={dangerColor} monitor={monitor} />
            ),
          },
          {
            align: 'right',
            field: 'ping',
            name: i18n.translate('xpack.uptime.monitorList.observabilityIntegrationsColumnLabel', {
              defaultMessage: 'Integrations',
              description:
                'The heading column of some action buttons that will take users to other Obsevability apps',
            }),
            render: (ping: Ping, monitor: LatestMonitor) => (
              <MonitorListActionsPopover
                basePath={basePath}
                dateRangeStart={dateRangeStart}
                dateRangeEnd={dateRangeEnd}
                monitor={monitor}
              />
            ),
          },
        ]}
        loading={loading}
        items={(data && data.monitorStatus && data.monitorStatus.monitors) || []}
        pagination={monitorListPagination}
      />
    </EuiPanel>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorListQuery
);
