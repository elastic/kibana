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
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SortState } from '../shared';
import { MetricsNodeDetailsLink, NumberCell, StepwisePagination, UptimeCell } from '../shared';
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
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
        <EuiLoadingSpinner size="xl" data-test-subj="podMetricsTableLoader" />
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.infra.metricsTable.pod.tableCaption', {
          defaultMessage: 'Infrastructure metrics for pods',
        })}
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
            ariaLabel={i18n.translate('xpack.infra.metricsTable.pod.paginationAriaLabel', {
              defaultMessage: 'Pod metrics pagination',
            })}
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
      name: i18n.translate('xpack.infra.metricsTable.pod.nameColumnHeader', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      truncateText: true,
      textOnly: true,
      render: (_, { id, name }) => {
        return (
          <MetricsNodeDetailsLink id={id} label={name} nodeType={'pod'} timerange={timerange} />
        );
      },
    },
    {
      name: i18n.translate('xpack.infra.metricsTable.pod.uptimeColumnHeader', {
        defaultMessage: 'Uptime',
      }),
      field: 'uptime',
      align: 'right',
      render: (uptime: number) => <UptimeCell uptimeMs={uptime} />,
    },
    {
      name: i18n.translate('xpack.infra.metricsTable.pod.averageCpuUsagePercentColumnHeader', {
        defaultMessage: 'CPU usage (avg.)',
      }),
      field: 'averageCpuUsagePercent',
      align: 'right',
      render: (averageCpuUsagePercent: number) => (
        <NumberCell value={averageCpuUsagePercent} unit="%" />
      ),
    },
    {
      name: i18n.translate('xpack.infra.metricsTable.pod.averageMemoryUsageMegabytesColumnHeader', {
        defaultMessage: 'Memory usage (avg.)',
      }),
      field: 'averageMemoryUsageMegabytes',
      align: 'right',
      render: (averageMemoryUsageMegabytes: number) => (
        <NumberCell value={averageMemoryUsageMegabytes} unit=" MB" />
      ),
    },
  ];
}
