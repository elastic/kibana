/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiBasicTable, EuiIcon, EuiLink, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';
import { HistogramPoint, X509Expiry } from '../../../../common/runtime_types';
import { MonitorSummary } from '../../../../common/runtime_types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { ExpandedRowMap } from './types';
import { MonitorBarSeries } from '../../common/charts';
import { MonitorPageLink } from '../../common/monitor_page_link';
import * as labels from './translations';
import { MonitorListDrawer } from './monitor_list_drawer/list_drawer_container';
import { MonitorListProps } from './monitor_list_container';
import { MonitorList } from '../../../state/reducers/monitor_list';
import { CertStatusColumn } from './cert_status_column';
import { MonitorListHeader } from './monitor_list_header';
import { URL_LABEL } from '../../common/translations';
import { EnableMonitorAlert } from './columns/enable_alert';
import { STATUS_ALERT_COLUMN } from './translations';

interface Props extends MonitorListProps {
  pageSize: number;
  setPageSize: (val: number) => void;
  monitorList: MonitorList;
}

const TruncatedEuiLink = styled(EuiLink)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const noItemsMessage = (loading: boolean, filters?: string) => {
  if (loading) return labels.LOADING;
  return !!filters ? labels.NO_MONITOR_ITEM_SELECTED : labels.NO_DATA_MESSAGE;
};

export const MonitorListComponent: ({
  filters,
  monitorList: { list, error, loading },
  linkParameters,
  pageSize,
  setPageSize,
  pageIndex,
  setPageIndex,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
}: Props) => any = ({
  filters,
  monitorList: { list, error, loading },
  linkParameters,
  pageSize,
  setPageSize,
  pageIndex,
  setPageIndex,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
}) => {
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = list.summaries ?? [];

  const getExpandedRowMap = () => {
    return drawerIds.reduce((map: ExpandedRowMap, id: string) => {
      return {
        ...map,
        [id]: (
          <MonitorListDrawer
            summary={items.find(({ monitor_id: monitorId }) => monitorId === id)!}
          />
        ),
      };
    }, {});
  };

  const columns = [
    {
      align: 'left' as const,
      field: 'summary.down',
      name: labels.STATUS_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      sortable: true,
      render: (_value: string, { state: { timestamp, summaryPings, summary } }: MonitorSummary) => {
        return (
          <MonitorListStatusColumn
            status={summary.status!}
            timestamp={timestamp}
            summaryPings={summaryPings ?? []}
          />
        );
      },
    },
    {
      align: 'left' as const,
      field: 'monitor.name',
      name: labels.NAME_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      sortable: true,
      render: (_value: string, { monitor_id: monitorId, state: { monitor } }: MonitorSummary) => (
        <MonitorPageLink monitorId={monitorId} linkParameters={linkParameters}>
          {monitor.name ? monitor.name : `Unnamed - ${monitorId}`}
        </MonitorPageLink>
      ),
    },
    {
      align: 'left' as const,
      field: 'url.full',
      name: URL_LABEL,
      sortable: true,
      render: (_value: string, { state: { url } }: MonitorSummary) => (
        <TruncatedEuiLink href={url.full} target="_blank" color="text">
          {url.full} <EuiIcon size="s" type="popout" color="subbdued" />
        </TruncatedEuiLink>
      ),
    },
    {
      align: 'left' as const,
      field: 'tls.server.x509.not_after',
      name: labels.TLS_COLUMN_LABEL,
      sortable: true,
      render: (_val: X509Expiry, { state }: MonitorSummary) => (
        <CertStatusColumn expiry={state.tls?.server.x509} />
      ),
    },
    {
      align: 'center' as const,
      field: 'histogram.points',
      name: labels.HISTORY_COLUMN_LABEL,
      mobileOptions: {
        show: false,
      },
      render: (histogramSeries: HistogramPoint[] | null, summary: MonitorSummary) => (
        <MonitorBarSeries histogramSeries={histogramSeries} minInterval={summary.minInterval!} />
      ),
    },
    {
      align: 'center' as const,
      field: '',
      name: STATUS_ALERT_COLUMN,
      width: '150px',
      render: (item: MonitorSummary) => (
        <EnableMonitorAlert
          monitorId={item.monitor_id}
          monitorName={item.state.monitor.name || item.monitor_id}
        />
      ),
    },
    {
      align: 'right' as const,
      field: 'monitor_id',
      name: '',
      sortable: true,
      isExpander: true,
      width: '24px',
      render: (id: string) => {
        return (
          <EuiButtonIcon
            aria-label={labels.getExpandDrawerLabel(id)}
            data-test-subj={`xpack.uptime.monitorList.${id}.expandMonitorDetail`}
            iconType={drawerIds.includes(id) ? 'arrowUp' : 'arrowDown'}
            onClick={() => {
              if (drawerIds.includes(id)) {
                updateDrawerIds(drawerIds.filter((p) => p !== id));
              } else {
                updateDrawerIds([...drawerIds, id]);
              }
            }}
          />
        );
      },
    },
  ];

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ page = {}, sort = {} }) => {
    const { field: sortFieldN, direction: sortDirectionN } = sort;

    setSortField(sortFieldN);
    setSortDirection(sortDirectionN);

    setPageIndex(page.index);
    setPageSize(page.size);
  };

  return (
    <EuiPanel>
      <MonitorListHeader />
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={labels.getDescriptionLabel(items.length)}
        error={error?.body?.message || error?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        itemIdToExpandedRowMap={getExpandedRowMap()}
        items={items}
        noItemsMessage={noItemsMessage(loading, filters)}
        columns={columns}
        sorting={sorting}
        pagination={{ totalItemCount: list.totalMonitors ?? 0, pageSize, pageIndex }}
        onChange={onTableChange}
      />
    </EuiPanel>
  );
};
