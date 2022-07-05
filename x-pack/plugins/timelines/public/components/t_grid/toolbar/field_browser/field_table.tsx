/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiInMemoryTable, Pagination, Direction } from '@elastic/eui';
import { BrowserFields, ColumnHeaderOptions } from '../../../../../common';
import { getFieldColumns, getFieldItems, isActionsColumn } from './field_items';
import { CATEGORY_TABLE_CLASS_NAME, TABLE_HEIGHT } from './helpers';
import type { GetFieldTableColumns } from '../../../../../common/types/field_browser';
import { FieldTableHeader } from './field_table_header';

const DEFAULT_SORTING: { field: string; direction: Direction } = {
  field: '',
  direction: 'asc',
} as const;

export interface FieldTableProps {
  columnHeaders: ColumnHeaderOptions[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /** when true, show only the the selected field */
  filterSelectedEnabled: boolean;
  onFilterSelectedChange: (enabled: boolean) => void;
  onToggleColumn: (fieldId: string) => void;
  /**
   * Optional function to customize field table columns
   */
  getFieldTableColumns?: GetFieldTableColumns;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryIds: string[];
  /** The text displayed in the search input */
  /** Invoked when a user chooses to view a new set of columns in the timeline */
  searchInput: string;
  /**
   * Hides the field browser when invoked
   */
  onHide: () => void;
}

const TableContainer = styled.div<{ height: number }>`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  ${({ height }) => `height: ${height}px`};
  overflow: hidden;
`;
TableContainer.displayName = 'TableContainer';

const Count = styled.span`
  font-weight: bold;
`;
Count.displayName = 'Count';

const FieldTableComponent: React.FC<FieldTableProps> = ({
  columnHeaders,
  filteredBrowserFields,
  filterSelectedEnabled,
  getFieldTableColumns,
  searchInput,
  selectedCategoryIds,
  onFilterSelectedChange,
  onToggleColumn,
  onHide,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DEFAULT_SORTING.field);
  const [sortDirection, setSortDirection] = useState<Direction>(DEFAULT_SORTING.direction);

  const fieldItems = useMemo(
    () =>
      getFieldItems({
        browserFields: filteredBrowserFields,
        selectedCategoryIds,
        columnHeaders,
      }),
    [columnHeaders, filteredBrowserFields, selectedCategoryIds]
  );

  /**
   * Pagination controls
   */
  const pagination: Pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: fieldItems.length,
      pageSizeOptions: [10, 25, 50],
    }),
    [fieldItems.length, pageIndex, pageSize]
  );

  useEffect(() => {
    // Resets the pagination when some filter has changed, consequently, the number of fields is different
    setPageIndex(0);
  }, [fieldItems.length]);

  /**
   * Sorting controls
   */
  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortDirection, sortField]
  );

  const onTableChange = useCallback(({ page, sort = DEFAULT_SORTING }) => {
    const { index, size } = page;
    const { field, direction } = sort;

    setPageIndex(index);
    setPageSize(size);

    setSortField(field);
    setSortDirection(direction);
  }, []);

  /**
   * Process columns
   */
  const columns = useMemo(
    () => getFieldColumns({ highlight: searchInput, onToggleColumn, getFieldTableColumns, onHide }),
    [onToggleColumn, searchInput, getFieldTableColumns, onHide]
  );
  const hasActions = useMemo(() => columns.some((column) => isActionsColumn(column)), [columns]);

  return (
    <>
      <FieldTableHeader
        fieldCount={fieldItems.length}
        filterSelectedEnabled={filterSelectedEnabled}
        onFilterSelectedChange={onFilterSelectedChange}
      />

      <TableContainer height={TABLE_HEIGHT}>
        <EuiInMemoryTable
          data-test-subj="field-table"
          className={`${CATEGORY_TABLE_CLASS_NAME} eui-yScroll`}
          items={fieldItems}
          itemId="name"
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          hasActions={hasActions}
          onChange={onTableChange}
          compressed
        />
      </TableContainer>
    </>
  );
};

export const FieldTable = React.memo(FieldTableComponent);
