/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';
import { HistogramPoint, X509Expiry } from '../../../../common/runtime_types';
import { MonitorSummary } from '../../../../common/runtime_types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { ExpandedRowMap } from './types';
import { MonitorBarSeries } from '../../common/charts';
import { MonitorPageLink } from '../../common/monitor_page_link';
import { OverviewPageLink } from './overview_page_link';
import * as labels from './translations';
import { MonitorListPageSizeSelect } from './monitor_list_page_size_select';
import { MonitorListDrawer } from './monitor_list_drawer/list_drawer_container';
import { MonitorListProps } from './monitor_list_container';
import { MonitorList } from '../../../state/reducers/monitor_list';
import { CertStatusColumn } from './cert_status_column';
import { MonitorListHeader } from './monitor_list_header';
import { URL_LABEL } from '../../common/translations';

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

export const MonitorListComponent: React.FC<Props> = ({
  filters,
  monitorList: { list, error, loading },
  linkParameters,
  pageSize,
  setPageSize,
}) => {
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = list.summaries ?? [];

  const nextPagePagination = list.nextPagePagination ?? '';
  const prevPagePagination = list.prevPagePagination ?? '';

  const getExpandedRowMap = () => {
    return drawerIds.reduce((map: ExpandedRowMap, id: string) => {
      return {
        ...map,
        [id]: (
          <MonitorListDrawer
            summary={items.find(({ monitor_id: monitorId }) => monitorId === id)}
          />
        ),
      };
    }, {});
  };

  const columns = [
    {
      align: 'left' as const,
      field: 'state.summary.status',
      name: labels.STATUS_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      render: (status: string, { state: { timestamp, summaryPings } }: MonitorSummary) => {
        return (
          <MonitorListStatusColumn
            status={status}
            timestamp={timestamp}
            summaryPings={summaryPings ?? []}
          />
        );
      },
    },
    {
      align: 'left' as const,
      field: 'state.monitor.name',
      name: labels.NAME_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      render: (name: string, summary: MonitorSummary) => (
        <MonitorPageLink monitorId={summary.monitor_id} linkParameters={linkParameters}>
          {name ? name : `Unnamed - ${summary.monitor_id}`}
        </MonitorPageLink>
      ),
      sortable: true,
    },
    {
      align: 'left' as const,
      field: 'state.url.full',
      name: URL_LABEL,
      render: (url: string, summary: MonitorSummary) => (
        <TruncatedEuiLink href={url} target="_blank" color="text">
          {url} <EuiIcon size="s" type="popout" color="subbdued" />
        </TruncatedEuiLink>
      ),
    },
    {
      align: 'left' as const,
      field: 'state.tls.server.x509',
      name: labels.TLS_COLUMN_LABEL,
      render: (x509: X509Expiry) => <CertStatusColumn expiry={x509} />,
    },
    {
      align: 'center' as const,
      field: 'histogram.points',
      name: labels.HISTORY_COLUMN_LABEL,
      mobileOptions: {
        show: false,
      },
      render: (histogramSeries: HistogramPoint[] | null) => (
        <MonitorBarSeries histogramSeries={histogramSeries} />
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

  return (
    <EuiPanel>
      <MonitorListHeader />
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={labels.getDescriptionLabel(items.length)}
        error={error?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        itemIdToExpandedRowMap={getExpandedRowMap()}
        items={items}
        noItemsMessage={noItemsMessage(loading, filters)}
        columns={columns}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <MonitorListPageSizeSelect size={pageSize} setSize={setPageSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <OverviewPageLink
                dataTestSubj="xpack.uptime.monitorList.prevButton"
                direction="prev"
                pagination={prevPagePagination}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <OverviewPageLink
                dataTestSubj="xpack.uptime.monitorList.nextButton"
                direction="next"
                pagination={nextPagePagination}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
