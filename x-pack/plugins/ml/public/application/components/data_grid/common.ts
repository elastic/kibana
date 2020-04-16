/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridSorting, EuiDataGridStyle } from '@elastic/eui';

import {
  IndexPattern,
  IFieldType,
  KBN_FIELD_TYPES,
} from '../../../../../../../src/plugins/data/public';

import { getNestedProperty } from '../../util/object_utils';

export const INIT_MAX_COLUMNS = 20;

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

export const getFieldsFromKibanaIndexPattern = (indexPattern: IndexPattern): string[] => {
  const allFields = indexPattern.fields.map(f => f.name);
  const indexPatternFields: string[] = allFields.filter(f => {
    if (indexPattern.metaFields.includes(f)) {
      return false;
    }

    const fieldParts = f.split('.');
    const lastPart = fieldParts.pop();
    if (lastPart === 'keyword' && allFields.includes(fieldParts.join('.'))) {
      return false;
    }

    return true;
  });

  return indexPatternFields;
};

export const getDataGridSchemaFromKibanaFieldType = (field: IFieldType | undefined) => {
  // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
  // To fall back to the default string schema it needs to be undefined.
  let schema;

  switch (field?.type) {
    case KBN_FIELD_TYPES.BOOLEAN:
      schema = 'boolean';
      break;
    case KBN_FIELD_TYPES.DATE:
      schema = 'datetime';
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
    case KBN_FIELD_TYPES.GEO_SHAPE:
      schema = 'json';
      break;
    case KBN_FIELD_TYPES.NUMBER:
      schema = 'numeric';
      break;
  }

  return schema;
};

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
