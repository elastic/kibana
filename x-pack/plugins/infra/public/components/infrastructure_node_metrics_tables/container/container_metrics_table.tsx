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
import React, { useCallback, useMemo } from 'react';
import type { SortState } from '../shared';
import {
  MetricsNodeDetailsLink,
  MetricsTableEmptyIndicesContent,
  MetricsTableErrorContent,
  MetricsTableLoadingContent,
  MetricsTableNoIndicesContent,
  NodeMetricsTableData,
  NumberCell,
  StepwisePagination,
  UptimeCell,
} from '../shared';
import type { ContainerNodeMetricsRow } from './use_container_metrics_table';

export interface ContainerMetricsTableProps {
  data: NodeMetricsTableData<ContainerNodeMetricsRow>;
  isLoading: boolean;
  setCurrentPageIndex: (value: number) => void;
  setSortState: (state: SortState<ContainerNodeMetricsRow>) => void;
  sortState: SortState<ContainerNodeMetricsRow>;
  timerange: {
    from: string;
    to: string;
  };
}

export const ContainerMetricsTable = (props: ContainerMetricsTableProps) => {
  const { data, isLoading, setCurrentPageIndex, setSortState, sortState, timerange } = props;

  const columns = useMemo(() => containerNodeColumns(timerange), [timerange]);

  const sortSettings: EuiTableSortingType<ContainerNodeMetricsRow> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const onTableSortChange = useCallback(
    ({ sort }: EuiCriteria<ContainerNodeMetricsRow>) => {
      if (!sort) {
        return;
      }

      setSortState(sort);
      setCurrentPageIndex(0);
    },
    [setSortState, setCurrentPageIndex]
  );

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
          tableCaption="Infrastructure metrics for containers"
          items={data.rows}
          columns={columns}
          sorting={sortSettings}
          onChange={onTableSortChange}
          loading={isLoading}
          noItemsMessage={<MetricsTableLoadingContent />}
          data-test-subj="containerMetricsTable"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <StepwisePagination
              ariaLabel="Container metrics pagination"
              pageCount={data.pageCount}
              currentPageIndex={data.currentPageIndex}
              setCurrentPageIndex={setCurrentPageIndex}
              data-test-subj="containerMetricsTablePagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return null;
  }
};

function containerNodeColumns(
  timerange: ContainerMetricsTableProps['timerange']
): Array<EuiBasicTableColumn<ContainerNodeMetricsRow>> {
  return [
    {
      name: 'Name',
      field: 'name',
      truncateText: true,
      render: (name: string) => {
        return <MetricsNodeDetailsLink id={name} nodeType={'container'} timerange={timerange} />;
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
      name: 'Memory usage(avg.)',
      field: 'averageMemoryUsageMegabytes',
      align: 'right',
      render: (averageMemoryUsageMegabytes: number) => (
        <NumberCell value={averageMemoryUsageMegabytes} unit=" MB" />
      ),
    },
  ];
}
