/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { LatestMonitor } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorTableQuery } from '../../queries/monitor_table_query';

interface MonTableProps {
  currentPage: string;
  currentSize: number;
  dangerColor: string;
  linkParameters?: string;
  updateSelectedPage: (index: string, size: number) => void;
}

interface MonTableQueryResult {
  getMonitorTable?: {
    items: LatestMonitor[];
    pages: string[];
    monitorIdCount: number;
  };
}

type Props = MonTableProps & UptimeGraphQLQueryProps<MonTableQueryResult>;

const MonTable = ({
  currentPage,
  currentSize,
  dangerColor,
  data,
  errors,
  linkParameters,
  loading,
  updateSelectedPage,
}: Props) => {
  if (data && data.getMonitorTable) {
    const { items, pages, monitorIdCount } = data.getMonitorTable;
    const pagination = {
      pageIndex: pages.indexOf(currentPage),
      pageSize: currentSize,
      totalItemCount: monitorIdCount,
      pageSizeOptions: [10, 25, 50],
    };
    const onChange = ({ page: { index, size } }: { page: { index: number; size: number } }) =>
      updateSelectedPage(pages ? pages[index] : '', size);
    return (
      <EuiPanel paddingSize="s">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>Monitor status</h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge>{monitorIdCount}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiBasicTable
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
                  {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.ip ? (
                    <EuiText size="xs" color="subdued">
                      {monitor.ping.monitor.ip}
                    </EuiText>
                  ) : null}
                </div>
              ),
            },
            // {
            //   field: 'upSeries',
            //   width: '180px',
            //   align: 'right',
            //   name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
            //     defaultMessage: 'Downtime history',
            //   }),
            //   render: (downSeries: MonitorSeriesPoint, monitor: LatestMonitor) => (
            //     <MonitorSparkline dangerColor={dangerColor} monitor={monitor} />
            //   ),
            // },
          ]}
          items={items || []}
          loading={loading}
          onChange={onChange}
          pagination={pagination}
        />
      </EuiPanel>
    );
  }
  return null;
};

export const MonitorTable = withUptimeGraphQL<MonTableQueryResult, MonTableProps>(
  MonTable,
  monitorTableQuery
);
