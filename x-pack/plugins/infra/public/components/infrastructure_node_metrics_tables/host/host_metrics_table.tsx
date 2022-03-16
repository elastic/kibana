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
import React, { useCallback, useMemo } from 'react';
import { MetricsNodeDetailsLink, NumberCell, StepwisePagination } from '../shared';
import type { SortState } from '../shared';
import type { HostNodeMetricsRow } from './use_host_metrics_table';

export interface HostMetricsTableProps {
  timerange: {
    from: string;
    to: string;
  };
  isLoading: boolean;
  hosts: HostNodeMetricsRow[];
  pageCount: number;
  currentPageIndex: number;
  setCurrentPageIndex: (value: number) => void;
  sortState: SortState<HostNodeMetricsRow>;
  setSortState: (state: SortState<HostNodeMetricsRow>) => void;
}

export const HostMetricsTable = (props: HostMetricsTableProps) => {
  const {
    timerange,
    isLoading,
    hosts,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  } = props;

  const columns = useMemo(() => hostMetricsColumns(timerange), [timerange]);

  const sortSettings: EuiTableSortingType<HostNodeMetricsRow> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const onTableSortChange = useCallback(
    ({ sort }: EuiCriteria<HostNodeMetricsRow>) => {
      if (!sort) {
        return;
      }

      setSortState(sort);
      setCurrentPageIndex(0);
    },
    [setSortState, setCurrentPageIndex]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="hostMetricsTableLoader" />;
  }

  return (
    <>
      <EuiBasicTable
        tableCaption="Infrastructure metrics for hosts"
        items={hosts}
        columns={columns}
        sorting={sortSettings}
        onChange={onTableSortChange}
        data-test-subj="hostMetricsTable"
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <StepwisePagination
            ariaLabel="Host metrics pagination"
            pageCount={pageCount}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            data-test-subj="hostMetricsTablePagination"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

function hostMetricsColumns(
  timerange: HostMetricsTableProps['timerange']
): Array<EuiBasicTableColumn<HostNodeMetricsRow>> {
  return [
    {
      name: 'Name',
      field: 'name',
      truncateText: true,
      render: (name: string) => (
        <MetricsNodeDetailsLink id={name} nodeType={'host'} timerange={timerange} />
      ),
    },
    {
      name: '# of CPUs',
      field: 'cpuCount',
      align: 'right',
      render: (cpuCount: number) => <NumberCell value={cpuCount} />,
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
      name: 'Memory total (avg.)',
      field: 'totalMemoryMegabytes',
      align: 'right',
      render: (totalMemoryMegabytes: number) => (
        <NumberCell value={totalMemoryMegabytes} unit=" MB" />
      ),
    },
    {
      name: 'Memory usage (avg.)',
      field: 'averageMemoryUsagePercent',
      align: 'right',
      render: (averageMemoryUsagePercent: number) => (
        <NumberCell value={averageMemoryUsagePercent} unit="%" />
      ),
    },
  ];
}
