/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridSorting, EuiDataGridStyle } from '@elastic/eui';

import { getNestedProperty } from '../../util/object_utils';

export const INIT_MAX_COLUMNS = 20;

/**
 * Helper to sort an array of objects based on an EuiDataGrid sorting configuration.
 * `sortFn()` is recursive to support sorting on multiple columns.
 *
 * @param sortingColumns - The EUI data grid sorting configuration
 * @returns The sorting function which can be used with an array's sort() function.
 */
export const multiColumnSortFactory = (sortingColumns: EuiDataGridSorting['columns']) => {
  const isString = (arg: any): arg is string => {
    return typeof arg === 'string';
  };

  const sortFn = (a: any, b: any, sortingColumnIndex = 0): number => {
    const sort = sortingColumns[sortingColumnIndex];
    const aValue = getNestedProperty(a, sort.id, null);
    const bValue = getNestedProperty(b, sort.id, null);

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (aValue < bValue) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (isString(aValue) && isString(bValue)) {
      if (aValue.localeCompare(bValue) === -1) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue.localeCompare(bValue) === 1) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (sortingColumnIndex + 1 < sortingColumns.length) {
      return sortFn(a, b, sortingColumnIndex + 1);
    }

    return 0;
  };

  return sortFn;
};

export const euiDataGridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  stripes: false,
  rowHover: 'none',
  header: 'shade',
};

export const euiDataGridToolbarSettings = {
  showColumnSelector: true,
  showStyleSelector: false,
  showSortSelector: true,
  showFullScreenSelector: false,
};
