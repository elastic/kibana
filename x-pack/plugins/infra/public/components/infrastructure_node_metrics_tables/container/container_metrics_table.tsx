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
import React, { useCallback, useMemo } from 'react';
import type { SortState } from '../shared';
import { MetricsNodeDetailsLink, NumberCell, StepwisePagination, UptimeCell } from '../shared';
import type { ContainerNodeMetricsRow } from './use_container_metrics_table';

export interface ContainerMetricsTableProps {
  timerange: {
    from: string;
    to: string;
  };
  isLoading: boolean;
  containers: ContainerNodeMetricsRow[];
  pageCount: number;
  currentPageIndex: number;
  setCurrentPageIndex: (value: number) => void;
  sortState: SortState<ContainerNodeMetricsRow>;
  setSortState: (state: SortState<ContainerNodeMetricsRow>) => void;
}

export const ContainerMetricsTable = (props: ContainerMetricsTableProps) => {
  const {
    timerange,
    isLoading,
    containers,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  } = props;

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

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
        <EuiLoadingSpinner size="xl" data-test-subj="containerMetricsTableLoader" />
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.infra.metricsTable.container.tableCaption', {
          defaultMessage: 'Infrastructure metrics for containers',
        })}
        items={containers}
        columns={columns}
        sorting={sortSettings}
        onChange={onTableSortChange}
        data-test-subj="containerMetricsTable"
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <StepwisePagination
            ariaLabel={i18n.translate('xpack.infra.metricsTable.container.paginationAriaLabel', {
              defaultMessage: 'Container metrics pagination',
            })}
            pageCount={pageCount}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            data-test-subj="containerMetricsTablePagination"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

function containerNodeColumns(
  timerange: ContainerMetricsTableProps['timerange']
): Array<EuiBasicTableColumn<ContainerNodeMetricsRow>> {
  return [
    {
      name: i18n.translate('xpack.infra.metricsTable.container.nameColumnHeader', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      truncateText: true,
      textOnly: true,
      render: (name: string) => {
        return (
          <MetricsNodeDetailsLink
            id={name}
            label={name}
            nodeType={'container'}
            timerange={timerange}
          />
        );
      },
    },
    {
      name: i18n.translate('xpack.infra.metricsTable.container.uptimeColumnHeader', {
        defaultMessage: 'Uptime',
      }),
      field: 'uptime',
      align: 'right',
      render: (uptime: number) => <UptimeCell uptimeMs={uptime} />,
    },
    {
      name: i18n.translate(
        'xpack.infra.metricsTable.container.averageCpuUsagePercentColumnHeader',
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
      name: i18n.translate(
        'xpack.infra.metricsTable.container.averageMemoryUsageMegabytesColumnHeader',
        {
          defaultMessage: 'Memory usage(avg.)',
        }
      ),
      field: 'averageMemoryUsageMegabytes',
      align: 'right',
      render: (averageMemoryUsageMegabytes: number) => (
        <NumberCell value={averageMemoryUsageMegabytes} unit=" MB" />
      ),
    },
  ];
}
