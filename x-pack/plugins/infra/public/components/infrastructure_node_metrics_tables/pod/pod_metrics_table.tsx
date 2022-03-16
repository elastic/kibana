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
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { MetricsNodeDetailsLink, NumberCell, StepwisePagination, UptimeCell } from '../shared';
import type { SortState } from '../shared';
import type { PodNodeMetricsRow } from './use_pod_metrics_table';

export interface PodMetricsTableProps {
  timerange: {
    from: string;
    to: string;
  };
  isLoading: boolean;
  pods: PodNodeMetricsRow[];
  pageCount: number;
  currentPageIndex: number;
  setCurrentPageIndex: (value: number) => void;
  sortState: SortState<PodNodeMetricsRow>;
  setSortState: (state: SortState<PodNodeMetricsRow>) => void;
}

export const PodMetricsTable = (props: PodMetricsTableProps) => {
  const {
    timerange,
    isLoading,
    pods,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  } = props;

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

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="podMetricsTableLoader" />;
  }

  return (
    <>
      <EuiBasicTable
        tableCaption="Infrastructure metrics for pods"
        items={pods}
        columns={columns}
        sorting={sorting}
        onChange={onTableSortChange}
        data-test-subj="podMetricsTable"
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <StepwisePagination
            ariaLabel="Pod metrics pagination"
            pageCount={pageCount}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            data-test-subj="podMetricsTablePagination"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
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
