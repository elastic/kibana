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
import { i18n } from '@kbn/i18n';
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
} from '../shared';
import type { HostNodeMetricsRow } from './use_host_metrics_table';

export interface HostMetricsTableProps {
  data: NodeMetricsTableData<HostNodeMetricsRow>;
  isLoading: boolean;
  setCurrentPageIndex: (value: number) => void;
  setSortState: (state: SortState<HostNodeMetricsRow>) => void;
  sortState: SortState<HostNodeMetricsRow>;
  timerange: {
    from: string;
    to: string;
  };
}

export const HostMetricsTable = (props: HostMetricsTableProps) => {
  const { data, isLoading, setCurrentPageIndex, setSortState, sortState, timerange } = props;

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
          tableCaption={i18n.translate('xpack.metricsData.metricsTable.host.tableCaption', {
            defaultMessage: 'Infrastructure metrics for hosts',
          })}
          items={data.rows}
          columns={columns}
          sorting={sortSettings}
          onChange={onTableSortChange}
          loading={isLoading}
          noItemsMessage={<MetricsTableLoadingContent />}
          data-test-subj="hostMetricsTable"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <StepwisePagination
              ariaLabel={i18n.translate('xpack.metricsData.metricsTable.host.paginationAriaLabel', {
                defaultMessage: 'Host metrics pagination',
              })}
              pageCount={data.pageCount}
              currentPageIndex={data.currentPageIndex}
              setCurrentPageIndex={setCurrentPageIndex}
              data-test-subj="hostMetricsTablePagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return null;
  }
};

function hostMetricsColumns(
  timerange: HostMetricsTableProps['timerange']
): Array<EuiBasicTableColumn<HostNodeMetricsRow>> {
  return [
    {
      name: i18n.translate('xpack.metricsData.metricsTable.host.nameColumnHeader', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      truncateText: true,
      textOnly: true,
      render: (name: string) => (
        <MetricsNodeDetailsLink id={name} label={name} nodeType={'host'} timerange={timerange} />
      ),
    },
    {
      name: i18n.translate('xpack.metricsData.metricsTable.host.CpuCountColumnHeader', {
        defaultMessage: '# of CPUs',
      }),
      field: 'cpuCount',
      align: 'right',
      render: (cpuCount: number) => <NumberCell value={cpuCount} />,
    },
    {
      name: i18n.translate(
        'xpack.metricsData.metricsTable.host.averageCpuUsagePercentColumnHeader',
        {
          defaultMessage: 'CPU usage (avg.)',
        }
      ),
      field: 'averageCpuUsagePercent',
      align: 'right',
      render: (averageCpuUsagePercent: number) => (
        <NumberCell value={averageCpuUsagePercent} unit="%" />
      ),
    },
    {
      name: i18n.translate('xpack.metricsData.metricsTable.host.totalMemoryMegabytesColumnHeader', {
        defaultMessage: 'Memory total',
      }),
      field: 'totalMemoryMegabytes',
      align: 'right',
      render: (totalMemoryMegabytes: number) => (
        <NumberCell value={totalMemoryMegabytes} unit=" MB" />
      ),
    },
    {
      name: i18n.translate(
        'xpack.metricsData.metricsTable.host.averageMemoryUsagePercentColumnHeader',
        {
          defaultMessage: 'Memory usage (avg.)',
        }
      ),
      field: 'averageMemoryUsagePercent',
      align: 'right',
      render: (averageMemoryUsagePercent: number) => (
        <NumberCell value={averageMemoryUsagePercent} unit="%" />
      ),
    },
  ];
}
