/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { useEffect, useMemo } from 'react';

import {
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
  EuiDataGridStyle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CoreSetup } from 'src/core/public';

import {
  IndexPattern,
  IFieldType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
} from '../../../../../../../src/plugins/data/public';

import { extractErrorMessage } from '../../../../common/util/errors';

import {
  BASIC_NUMERICAL_TYPES,
  EXTENDED_NUMERICAL_TYPES,
} from '../../data_frame_analytics/common/fields';

import {
  FEATURE_IMPORTANCE,
  FEATURE_INFLUENCE,
  OUTLIER_SCORE,
  TOP_CLASSES,
} from '../../data_frame_analytics/common/constants';
import { formatHumanReadableDateTimeSeconds } from '../../util/date_utils';
import { getNestedProperty } from '../../util/object_utils';
import { mlFieldFormatService } from '../../services/field_format_service';

import { DataGridItem, IndexPagination, RenderCellValue } from './types';

export const INIT_MAX_COLUMNS = 10;

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
  const allFields = indexPattern.fields.map((f) => f.name);
  const indexPatternFields: string[] = allFields.filter((f) => {
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

export interface FieldTypes {
  [key: string]: ES_FIELD_TYPES;
}

export const getDataGridSchemasFromFieldTypes = (fieldTypes: FieldTypes, resultsField: string) => {
  return Object.keys(fieldTypes).map((field) => {
    // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
    // To fall back to the default string schema it needs to be undefined.
    let schema;
    const isSortable = true;
    const type = fieldTypes[field];

    const isNumber =
      type !== undefined && (BASIC_NUMERICAL_TYPES.has(type) || EXTENDED_NUMERICAL_TYPES.has(type));
    if (isNumber) {
      schema = 'numeric';
    }

    switch (type) {
      case 'date':
        schema = 'datetime';
        break;
      case 'geo_point':
        schema = 'json';
        break;
      case 'boolean':
        schema = 'boolean';
        break;
      case 'text':
        schema = NON_AGGREGATABLE;
    }

    if (
      field === `${resultsField}.${OUTLIER_SCORE}` ||
      field.includes(`${resultsField}.${FEATURE_INFLUENCE}`)
    ) {
      schema = 'numeric';
    }

    if (
      field.includes(`${resultsField}.${FEATURE_IMPORTANCE}`) ||
      field.includes(`${resultsField}.${TOP_CLASSES}`)
    ) {
      schema = 'json';
    }

    return { id: field, schema, isSortable };
  });
};

export const NON_AGGREGATABLE = 'non-aggregatable';
export const getDataGridSchemaFromKibanaFieldType = (
  field: IFieldType | undefined
): string | undefined => {
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

  if (schema === undefined && field?.aggregatable === false) {
    return NON_AGGREGATABLE;
  }

  return schema;
};

export const useRenderCellValue = (
  indexPattern: IndexPattern | undefined,
  pagination: IndexPagination,
  tableItems: DataGridItem[],
  resultsField?: string,
  cellPropsCallback?: (
    columnId: string,
    cellValue: any,
    fullItem: Record<string, any>,
    setCellProps: EuiDataGridCellValueElementProps['setCellProps']
  ) => void
): RenderCellValue => {
  const renderCellValue: RenderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const fullItem = tableItems[adjustedRowIndex];

      if (fullItem === undefined) {
        return null;
      }

      if (indexPattern === undefined) {
        return null;
      }

      let format: any;

      if (indexPattern !== undefined) {
        format = mlFieldFormatService.getFieldFormatFromIndexPattern(indexPattern, columnId, '');
      }

      function getCellValue(cId: string) {
        if (cId.includes(`.${FEATURE_INFLUENCE}.`) && resultsField !== undefined) {
          const results = getNestedProperty(tableItems[adjustedRowIndex], resultsField, null);
          return results[cId.replace(`${resultsField}.`, '')];
        }

        return tableItems.hasOwnProperty(adjustedRowIndex)
          ? getNestedProperty(tableItems[adjustedRowIndex], cId, null)
          : null;
      }

      const cellValue = getCellValue(columnId);

      // React by default doesn't all us to use a hook in a callback.
      // However, this one will be passed on to EuiDataGrid and its docs
      // recommend wrapping `setCellProps` in a `useEffect()` hook
      // so we're ignoring the linting rule here.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (typeof cellPropsCallback === 'function') {
          cellPropsCallback(columnId, cellValue, fullItem, setCellProps);
        }
      }, [columnId, cellValue]);

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      if (format !== undefined) {
        return format.convert(cellValue, 'text');
      }

      if (typeof cellValue === 'string' || cellValue === null) {
        return cellValue;
      }

      const field = indexPattern.fields.getByName(columnId);
      if (field?.type === KBN_FIELD_TYPES.DATE) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (typeof cellValue === 'boolean') {
        return cellValue ? 'true' : 'false';
      }

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      return cellValue;
    };
  }, [indexPattern?.fields, pagination.pageIndex, pagination.pageSize, tableItems]);
  return renderCellValue;
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

export const showDataGridColumnChartErrorMessageToast = (
  e: any,
  toastNotifications: CoreSetup['notifications']['toasts']
) => {
  const error = extractErrorMessage(e);

  toastNotifications.addDanger(
    i18n.translate('xpack.ml.dataGrid.columnChart.ErrorMessageToast', {
      defaultMessage: 'An error occurred fetching the histogram charts data: {error}',
      values: { error: error !== '' ? error : e },
    })
  );
};
