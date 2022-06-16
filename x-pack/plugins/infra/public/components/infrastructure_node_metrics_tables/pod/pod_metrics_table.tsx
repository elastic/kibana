/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Criteria as EuiCriteria,
  EuiBasicTableColumn,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  MetricsNodeDetailsLink,
  NodeMetricsTableData,
  NumberCell,
  StepwisePagination,
  UptimeCell,
  MetricsTableEmptyIndicesContent,
  MetricsTableErrorContent,
  MetricsTableLoadingContent,
  MetricsTableNoIndicesContent,
} from '../shared';
import type { SortState } from '../shared';
import type { PodNodeMetricsRow } from './use_pod_metrics_table';

export interface PodMetricsTableProps {
  data: NodeMetricsTableData<PodNodeMetricsRow>;
  isLoading: boolean;
  setCurrentPageIndex: (value: number) => void;
  setSortState: (state: SortState<PodNodeMetricsRow>) => void;
  sortState: SortState<PodNodeMetricsRow>;
  timerange: {
    from: string;
    to: string;
  };
}

export const PodMetricsTable = (props: PodMetricsTableProps) => {
  const { data, isLoading, setCurrentPageIndex, setSortState, sortState, timerange } = props;

  const columns = useMemo(() => podNodeColumns(timerange), [timerange]);

  const sorting: EuiTableSortingType<PodNodeMetricsRow> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const onTableSortChange = ({
    sort = {
      direction: 'desc',
      field: 'averageCpuUsagePercent',
    },
  }: EuiCriteria<PodNodeMetricsRow>) => {
    setSortState(sort);
    setCurrentPageIndex(0);
  };

  if (data.state === 'error') {
    return (
      <>
        {data.errors.map((error) => (
          <MetricsTableErrorContent error={error} />
        ))}
      </>
    );
  } else if (isLoading && data.state !== 'data') {
    return <MetricsTableLoadingContent />;
  } else if (data.state === 'no-indices') {
    return <MetricsTableNoIndicesContent />;
  } else if (data.state === 'empty-indices') {
    return <MetricsTableEmptyIndicesContent />;
  } else if (data.state === 'data') {
    return (
      <>
        <EuiBasicTable
          tableCaption="Infrastructure metrics for pods"
          items={data.rows}
          columns={columns}
          sorting={sorting}
          onChange={onTableSortChange}
          loading={isLoading}
          noItemsMessage={<MetricsTableLoadingContent />}
          data-test-subj="podMetricsTable"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <StepwisePagination
              ariaLabel="Pod metrics pagination"
              pageCount={data.pageCount}
              currentPageIndex={data.currentPageIndex}
              setCurrentPageIndex={setCurrentPageIndex}
              data-test-subj="podMetricsTablePagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return null;
  }
};

function podNodeColumns(
  timerange: PodMetricsTableProps['timerange']
): Array<EuiBasicTableColumn<PodNodeMetricsRow>> {
  return [
    {
      name: 'Name',
      field: 'name',
      truncateText: true,
      render: (name: string) => {
        return <MetricsNodeDetailsLink id={name} nodeType={'pod'} timerange={timerange} />;
      },
    },
    {
      name: 'Uptime',
      field: 'uptime',
      align: 'right',
      render: (uptime: number) => <UptimeCell uptimeMs={uptime} />,
    },
    {
      name: 'CPU usage (avg.)',
      field: 'averageCpuUsagePercent',
      align: 'right',
      render: (averageCpuUsagePercent: number) => (
        <NumberCell value={averageCpuUsagePercent} unit="%" />
      ),
    },
    {
      name: 'Memory usage (avg.)',
      field: 'averageMemoryUsageMegabytes',
      align: 'right',
      render: (averageMemoryUsageMegabytes: number) => (
        <NumberCell value={averageMemoryUsageMegabytes} unit=" MB" />
      ),
    },
  ];
}
