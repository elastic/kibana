/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiBasicTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  Direction,
} from '@elastic/eui';
import React, { useState } from 'react';
import { HistogramPoint, X509Expiry } from '../../../../common/runtime_types';
import { MonitorSummary } from '../../../../common/runtime_types';
import { MonitorListStatusColumn } from './columns/monitor_status_column';
import { ExpandedRowMap } from './types';
import { MonitorBarSeries } from '../../common/charts';
import * as labels from './translations';
import { MonitorListDrawer } from './monitor_list_drawer/list_drawer_container';
import { MonitorListProps } from './monitor_list_container';
import { MonitorList } from '../../../state/reducers/monitor_list';
import { CertStatusColumn } from './columns/cert_status_column';
import { MonitorListHeader } from './monitor_list_header';
import { URL_LABEL } from '../../common/translations';
import { EnableMonitorAlert } from './columns/enable_alert';
import { STATUS_ALERT_COLUMN } from './translations';
import { MonitorNameColumn } from './columns/monitor_name_col';

interface Page {
  index: number;
  size: number;
}

export type MonitorFields =
  | 'sha256'
  | 'sha1'
  | 'issuer'
  | 'common_name'
  | 'monitors'
  | 'not_after'
  | 'not_before';

interface Sort {
  field: MonitorFields;
  direction: Direction;
}

interface Props extends MonitorListProps {
  pageSize: number;
  total: number;
  setPageSize: (val: number) => void;
  monitorList: MonitorList;
  pageIndex: number;
  setPageIndex: (val: number) => void;
  sortField: MonitorFields;
  setSortField: (val: string) => void;
  sortDirection: string;
  setSortDirection: (val: string) => void;
}

export const noItemsMessage = (loading: boolean, filters?: string) => {
  if (loading) return labels.LOADING;
  return !!filters ? labels.NO_MONITOR_ITEM_SELECTED : labels.NO_DATA_MESSAGE;
};

export const MonitorListComponent: ({
  filters,
  monitorList: { list, error, loading },
  pageSize,
  setPageSize,
  pageIndex,
  setPageIndex,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  total,
}: Props) => any = ({
  filters,
  monitorList: { list, error, loading },
  pageSize,
  setPageSize,
  pageIndex,
  setPageIndex,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  total,
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
      render: (name: string, summary: MonitorSummary) => <MonitorNameColumn summary={summary} />,
      sortable: true,
    },
    {
      align: 'left' as const,
      field: 'url.full',
      name: URL_LABEL,
      width: '40%',
      sortable: true,
      render: (url: string, { state }: MonitorSummary) => (
        <EuiLink href={state.url.full} target="_blank" color="text" external>
          {state.url.full}
        </EuiLink>
      ),
    },
    {
      align: 'left' as const,
      field: 'tls.server.x509.not_after',
      name: labels.TLS_COLUMN_LABEL,
      sortable: true,
      render: (_val: X509Expiry, { state }: MonitorSummary) => (
        <CertStatusColumn expiry={state.tls?.server?.x509!} />
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
      width: '100px',
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
      width: '40px',
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

  const onTableChange = ({ page, sort }: { page: Page; sort: Sort }) => {
    const { field: sortFieldN, direction: sortDirectionN } = sort ?? {};

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
        tableLayout={'auto'}
        sorting={sorting}
        pagination={{
          totalItemCount: total ?? 0,
          pageSize,
          pageIndex,
          pageSizeOptions: [5, 10, 25, 50, 100],
        }}
        onChange={onTableChange}
      />
    </EuiPanel>
  );
};
