/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState, useCallback } from 'react';
import {
  EuiDataGrid,
  EuiPanel,
  EuiDataGridColumn,
  EuiDataGridColumnVisibility,
  EuiDataGridStyle,
  EuiDataGridSorting,
  EuiDataGridInMemory,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter } from '../../hooks';
import { addTimerangeToQuery } from '../../utils/add_timerange_to_query';
import { useFetchContainerNameData } from './hooks';
import { CONTAINER_IMAGE_NAME } from '../../../common/constants';

export interface ContainerNameWidgetDataValueMap {
  key: string;
  doc_count:number;
  count_by_aggs: {
    value: number;
  };
}

export interface ContainerNameArrayDataValue {
  [key: string]: any;
  name: string;
  count: number;
}

export interface ContainerNameWidgetDeps {
  widgetKey: string;
  indexPattern?: IndexPattern;
  globalFilter: GlobalFilter;
  groupedBy: string;
  countBy?: string;
}

interface FilterButtons {
  filterForButtons: ReactNode[];
  filterOutButtons: ReactNode[];
}

export const ContainerNameWidget = ({
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
  countBy,
}: ContainerNameWidgetDeps) => {
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const { data } = useFetchContainerNameData(
    filterQueryWithTimeRange,
    widgetKey,
    groupedBy,
    countBy,
    indexPattern?.title
  );

  const { getFilterForValueButton, getFilterOutValueButton, filterManager } = useSetFilter();
  const filterButtons = useMemo(() => {
    const result: FilterButtons = {
      filterForButtons:
        data &&
        data.map((aggResult: ContainerNameWidgetDataValueMap) => {
          return getFilterForValueButton({
            field: CONTAINER_IMAGE_NAME,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: aggResult.key,
          });
        }),

      filterOutButtons:
        data &&
        data.map((aggResult: ContainerNameWidgetDataValueMap) => {
          return getFilterOutValueButton({
            field: CONTAINER_IMAGE_NAME,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: aggResult.key,
          });
        }),
    };

    return result;
  }, [data, getFilterForValueButton, getFilterOutValueButton, filterManager]);

  const widgetTitle = i18n.translate(
    'xpack.kubernetesSecurity.containerNameWidget.ContainerImage',
    {
      defaultMessage: 'Container Images Session',
    }
  );

  const containerNameArray: ContainerNameArrayDataValue[] = data
    ? data.map((aggResult: ContainerNameWidgetDataValueMap) => {
        return {
          name: aggResult.key,
          count: aggResult.count_by_aggs.value,
        };
      })
    : [];

  const columns: EuiDataGridColumn[] = [
    {
      id: 'name',
      displayAsText: widgetTitle,
      actions: false,
      initialWidth: 216,
      isResizable: true,
      cellActions: [
        ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
          const indexHelper = containerNameArray.findIndex((obj) => {
            return obj.name === containerNameArray[rowIndex][columnId];
          });
          return <> {filterButtons.filterForButtons[indexHelper]}</>;
        },
        ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
          const indexHelper = containerNameArray.findIndex((obj) => {
            return obj.name === containerNameArray[rowIndex][columnId];
          });
          return <>{filterButtons.filterOutButtons[indexHelper]}</>;
        },
      ],
    },
    {
      id: 'count',
      displayAsText: 'Count',
      initialWidth: 75,
    },
  ];

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  // Sorting
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (sortingColumn) => {
      setSortingColumns(sortingColumn);
    },
    [setSortingColumns]
  );

  const GridStyle: EuiDataGridStyle = {
    border: 'none',
    header: 'underline',
    fontSize: 's',
  };

  const ColumnVisibility: EuiDataGridColumnVisibility = {
    visibleColumns,
    setVisibleColumns,
  };

  const InMemory: EuiDataGridInMemory = { level: 'sorting' };

  const Sorting: EuiDataGridSorting = {
    columns: sortingColumns,
    onSort,
  };

  return (
    <EuiPanel css={styles.tablePadding} hasShadow={false}>
      <EuiDataGrid
        aria-label="Container name sessions table widget"
        columns={columns}
        rowCount={containerNameArray.length}
        toolbarVisibility={false}
        gridStyle={GridStyle}
        columnVisibility={ColumnVisibility}
        renderCellValue={({ rowIndex, columnId }: { rowIndex: number; columnId: string }) =>
          containerNameArray[rowIndex][columnId]
        }
        inMemory={InMemory}
        sorting={Sorting}
      />
    </EuiPanel>
  );
};
