/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridSorting } from '@elastic/eui';
import { useCallback, useMemo, useState } from 'react';

import { EuiDataGridColumnSortingConfig } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { DefaultSort } from './constants';

const formatGridColumns = (cols: SortCombinations[]): EuiDataGridSorting['columns'] => {
  const colsSorting: EuiDataGridSorting['columns'] = [];
  cols.forEach((col) => {
    Object.entries(col).forEach(([field, oSort]) => {
      colsSorting.push({ id: field, direction: oSort.order });
    });
  });
  return colsSorting;
};

export type UseSorting = (
  onSortChange: (sort: EuiDataGridSorting['columns']) => void,
  defaultSort: SortCombinations[]
) => {
  sortingColumns: EuiDataGridSorting['columns'];
  onSort: (newSort: EuiDataGridSorting['columns']) => void;
};

export function useSorting(
  onSortChange: (sort: EuiDataGridSorting['columns']) => void,
  visibleColumns: string[],
  defaultSort: SortCombinations[] = DefaultSort
) {
  const [visibleColumnsSort, invisibleColumnsSort] = useMemo(() => {
    const visibleSort: SortCombinations[] = [];
    const invisibleSort: EuiDataGridColumnSortingConfig[] = [];
    defaultSort.forEach((sortCombinations) => {
      if (visibleColumns.includes(Object.keys(sortCombinations)[0])) {
        visibleSort.push(sortCombinations);
      } else {
        invisibleSort.push(...formatGridColumns([sortCombinations]));
      }
    });
    return [visibleSort, invisibleSort];
  }, [defaultSort, visibleColumns]);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>(
    formatGridColumns(visibleColumnsSort)
  );
  const onSort = useCallback<EuiDataGridSorting['onSort']>(
    (sortingConfig) => {
      onSortChange([...sortingConfig, ...invisibleColumnsSort]);
      setSortingColumns(sortingConfig);
    },
    [onSortChange, invisibleColumnsSort]
  );
  return { sortingColumns, onSort };
}
