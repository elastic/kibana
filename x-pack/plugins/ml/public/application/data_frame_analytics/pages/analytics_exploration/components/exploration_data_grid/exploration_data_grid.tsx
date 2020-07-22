/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, FC, SetStateAction, useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiDataGrid, EuiDataGridPaginationProps, EuiDataGridSorting } from '@elastic/eui';

import { euiDataGridStyle, euiDataGridToolbarSettings } from '../../../../common';

import { mlFieldFormatService } from '../../../../../services/field_format_service';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

const FEATURE_INFLUENCE = 'feature_influence';
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

type Pagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;
type TableItem = Record<string, any>;

interface ExplorationDataGridProps {
  colorRange: (d: number) => string;
  columns: any[];
  indexPattern: IndexPattern;
  pagination: Pagination;
  resultsField: string;
  rowCount: number;
  selectedFields: string[];
  setPagination: Dispatch<SetStateAction<Pagination>>;
  setSelectedFields: Dispatch<SetStateAction<string[]>>;
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  sortingColumns: EuiDataGridSorting['columns'];
  tableItems: TableItem[];
}

export const ExplorationDataGrid: FC<ExplorationDataGridProps> = ({
  colorRange,
  columns,
  indexPattern,
  pagination,
  resultsField,
  rowCount,
  selectedFields,
  setPagination,
  setSelectedFields,
  setSortingColumns,
  sortingColumns,
  tableItems,
}) => {
  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const fullItem = tableItems[adjustedRowIndex];

      if (fullItem === undefined) {
        return null;
      }

      let format: any;

      if (indexPattern !== undefined) {
        format = mlFieldFormatService.getFieldFormatFromIndexPattern(indexPattern, columnId, '');
      }

      const cellValue =
        fullItem.hasOwnProperty(columnId) && fullItem[columnId] !== undefined
          ? fullItem[columnId]
          : null;

      const split = columnId.split('.');
      let backgroundColor;

      // column with feature values get color coded by its corresponding influencer value
      if (fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`] !== undefined) {
        backgroundColor = colorRange(fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`]);
      }

      // column with influencer values get color coded by its own value
      if (split.length > 2 && split[0] === resultsField && split[1] === FEATURE_INFLUENCE) {
        backgroundColor = colorRange(cellValue);
      }

      if (backgroundColor !== undefined) {
        setCellProps({
          style: { backgroundColor },
        });
      }

      if (format !== undefined) {
        return format.convert(cellValue, 'text');
      }

      if (typeof cellValue === 'string' || cellValue === null) {
        return cellValue;
      }

      if (typeof cellValue === 'boolean') {
        return cellValue ? 'true' : 'false';
      }

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      return cellValue;
    };
  }, [resultsField, rowCount, tableItems, pagination.pageIndex, pagination.pageSize]);

  const onChangeItemsPerPage = useCallback(
    (pageSize) => {
      setPagination((p) => {
        const pageIndex = Math.floor((p.pageSize * p.pageIndex) / pageSize);
        return { pageIndex, pageSize };
      });
    },
    [setPagination]
  );

  const onChangePage = useCallback((pageIndex) => setPagination((p) => ({ ...p, pageIndex })), [
    setPagination,
  ]);

  const onSort = useCallback((sc) => setSortingColumns(sc), [setSortingColumns]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.ml.dataframe.analytics.exploration.dataGridAriaLabel', {
        defaultMessage: 'Outlier detection results table',
      })}
      columns={columns}
      columnVisibility={{
        visibleColumns: selectedFields,
        setVisibleColumns: setSelectedFields,
      }}
      gridStyle={euiDataGridStyle}
      rowCount={rowCount}
      renderCellValue={renderCellValue}
      sorting={{ columns: sortingColumns, onSort }}
      toolbarVisibility={euiDataGridToolbarSettings}
      pagination={{
        ...pagination,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        onChangeItemsPerPage,
        onChangePage,
      }}
    />
  );
};
