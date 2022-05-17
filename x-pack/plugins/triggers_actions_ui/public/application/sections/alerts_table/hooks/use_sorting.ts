/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridSorting } from '@elastic/eui';
import { useCallback, useState } from 'react';

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
  defaultSort: SortCombinations[] = DefaultSort
) {
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>(
    formatGridColumns(defaultSort)
  );
  const onSort = useCallback(
    (_state) => {
      onSortChange(_state);
      setSortingColumns(_state);
    },
    [setSortingColumns, onSortChange]
  );
  return { sortingColumns, onSort };
}
