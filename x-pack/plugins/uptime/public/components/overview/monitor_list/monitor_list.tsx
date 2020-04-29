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
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { HistogramPoint, FetchMonitorStatesQueryArgs } from '../../../../common/runtime_types';
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
import { useUrlParams } from '../../../hooks';
import { CERTIFICATES_ROUTE } from '../../../../common/constants';
import { CertStatusColumn } from './cert_status_column';

interface Props extends MonitorListProps {
  lastRefresh: number;
  monitorList: MonitorList;
  getMonitorList: (params: FetchMonitorStatesQueryArgs) => void;
}

const TruncatedEuiLink = styled(EuiLink)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.monitorList.pageSize';
const getPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

export const MonitorListComponent: React.FC<Props> = ({
  filters,
  getMonitorList,
  lastRefresh,
  monitorList: { list, error, loading },
  linkParameters,
}) => {
  const [pageSize, setPageSize] = useState<number>(getPageSizeValue());
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const [getUrlValues] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, pagination, statusFilter } = getUrlValues();

  useEffect(() => {
    getMonitorList({
      dateRangeStart,
      dateRangeEnd,
      filters,
      pageSize,
      pagination,
      statusFilter,
    });
  }, [
    getMonitorList,
    dateRangeStart,
    dateRangeEnd,
    filters,
    lastRefresh,
    pageSize,
    pagination,
    statusFilter,
  ]);

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
      field: 'state.monitor.status',
      name: labels.STATUS_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      render: (status: string, { state: { timestamp, checks } }: MonitorSummary) => {
        return (
          <MonitorListStatusColumn status={status} timestamp={timestamp} checks={checks ?? []} />
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
      name: labels.URL,
      render: (url: string, summary: MonitorSummary) => (
        <TruncatedEuiLink href={url} target="_blank" color="text">
          {url} <EuiIcon size="s" type="popout" color="subbdued" />
        </TruncatedEuiLink>
      ),
    },
    {
      align: 'center' as const,
      field: 'state.tls',
      name: labels.TLS_COLUMN_LABEL,
      render: (tls: any) => <CertStatusColumn cert={tls?.[0]} />,
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
            iconType={drawerIds.includes(id) ? 'arrowUp' : 'arrowDown'}
            onClick={() => {
              if (drawerIds.includes(id)) {
                updateDrawerIds(drawerIds.filter(p => p !== id));
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.uptime.monitorList.monitoringStatusTitle"
                defaultMessage="Monitor status"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5>
              <Link to={CERTIFICATES_ROUTE} data-test-subj="uptimeCertificatesLink">
                <FormattedMessage
                  id="xpack.uptime.monitorList.viewCertificateTitle"
                  defaultMessage="View certificates status"
                />
              </Link>
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={labels.getDescriptionLabel(items.length)}
        error={error?.message}
        // Only set loading to true when there are no items present to prevent the bug outlined in
        // in https://github.com/elastic/eui/issues/2393 . Once that is fixed we can simply set the value here to
        // loading={loading}
        loading={loading && (!items || items.length < 1)}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        itemIdToExpandedRowMap={getExpandedRowMap()}
        items={items}
        noItemsMessage={!!filters ? labels.NO_MONITOR_ITEM_SELECTED : labels.NO_DATA_MESSAGE}
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
