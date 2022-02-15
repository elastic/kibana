/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useEffect, useMemo } from 'react';

import { EuiDataGridCellValueElementProps, EuiDataGridStyle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CoreSetup } from 'src/core/public';

import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

import type { DataView, DataViewField } from '../../../../../../../src/plugins/data_views/common';

import { DEFAULT_RESULTS_FIELD } from '../../../../common/constants/data_frame_analytics';
import { extractErrorMessage } from '../../../../common/util/errors';
import {
  FeatureImportance,
  FeatureImportanceClassName,
  TopClasses,
} from '../../../../common/types/feature_importance';

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
import { formatHumanReadableDateTimeSeconds } from '../../../../common/util/date_utils';
import { getNestedProperty } from '../../util/object_utils';
import { mlFieldFormatService } from '../../services/field_format_service';

import { DataGridItem, IndexPagination, RenderCellValue } from './types';
import { RuntimeMappings } from '../../../../common/types/fields';
import { isRuntimeMappings } from '../../../../common/util/runtime_field_utils';

export const INIT_MAX_COLUMNS = 10;
export const COLUMN_CHART_DEFAULT_VISIBILITY_ROWS_THRESHOLED = 10000;

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
  showDisplaySelector: false,
  showSortSelector: true,
  showFullScreenSelector: false,
};

export const getFieldsFromKibanaIndexPattern = (indexPattern: DataView): string[] => {
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

/**
 * Return a map of runtime_mappings for each of the index pattern field provided
 * to provide in ES search queries
 * @param indexPattern
 * @param RuntimeMappings
 */
export function getCombinedRuntimeMappings(
  indexPattern: DataView | undefined,
  runtimeMappings?: RuntimeMappings
): RuntimeMappings | undefined {
  let combinedRuntimeMappings = {};

  // Add runtime field mappings defined by index pattern
  if (indexPattern) {
    const computedFields = indexPattern?.getComputedFields();
    if (computedFields?.runtimeFields !== undefined) {
      const indexPatternRuntimeMappings = computedFields.runtimeFields;
      if (isRuntimeMappings(indexPatternRuntimeMappings)) {
        combinedRuntimeMappings = { ...combinedRuntimeMappings, ...indexPatternRuntimeMappings };
      }
    }
  }

  // Use runtime field mappings defined inline from API
  // and override fields with same name from index pattern
  if (isRuntimeMappings(runtimeMappings)) {
    combinedRuntimeMappings = { ...combinedRuntimeMappings, ...runtimeMappings };
  }

  if (isRuntimeMappings(combinedRuntimeMappings)) {
    return combinedRuntimeMappings;
  }
}

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
      case 'nested':
      case 'geo_point':
        schema = 'json';
        break;
      case 'boolean':
        schema = 'boolean';
        break;
      case 'text':
        schema = NON_AGGREGATABLE;
    }

    if (field === `${resultsField}.${OUTLIER_SCORE}`) {
      schema = 'numeric';
    }

    if (field.includes(`${resultsField}.${TOP_CLASSES}`)) {
      schema = 'json';
    }

    if (field.includes(`${resultsField}.${FEATURE_IMPORTANCE}`)) {
      schema = 'featureImportance';
    }

    if (field === `${resultsField}.${FEATURE_INFLUENCE}`) {
      schema = 'featureInfluence';
    }

    return { id: field, schema, isSortable };
  });
};

export const NON_AGGREGATABLE = 'non-aggregatable';

export const getDataGridSchemaFromESFieldType = (
  fieldType: ES_FIELD_TYPES | undefined | estypes.MappingRuntimeField['type'] | 'number'
): string | undefined => {
  // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
  // To fall back to the default string schema it needs to be undefined.
  let schema;

  switch (fieldType) {
    case ES_FIELD_TYPES.GEO_POINT:
    case ES_FIELD_TYPES.GEO_SHAPE:
      schema = 'json';
      break;
    case ES_FIELD_TYPES.BOOLEAN:
      schema = 'boolean';
      break;
    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      schema = 'datetime';
      break;
    case ES_FIELD_TYPES.BYTE:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.SHORT:
    case 'number':
      schema = 'numeric';
      break;
    // keep schema undefined for text based columns
    case ES_FIELD_TYPES.KEYWORD:
    case ES_FIELD_TYPES.TEXT:
      break;
  }

  return schema;
};

export const getDataGridSchemaFromKibanaFieldType = (
  field: DataViewField | undefined
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
    case KBN_FIELD_TYPES.NESTED:
      schema = 'json';
      break;
  }

  if (schema === undefined && field?.aggregatable === false) {
    return NON_AGGREGATABLE;
  }

  return schema;
};

const getClassName = (className: string, isClassTypeBoolean: boolean) => {
  if (isClassTypeBoolean) {
    return className === 'true';
  }

  return className;
};

/**
 * Helper to transform feature importance fields with arrays back to primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @returns nested object structure of feature importance values
 */
export const getFeatureImportance = (
  row: Record<string, any>,
  mlResultsField: string,
  isClassTypeBoolean = false
): FeatureImportance[] => {
  const featureImportance: Array<{
    feature_name: string[];
    classes?: Array<{ class_name: FeatureImportanceClassName[]; importance: number[] }>;
    importance?: number | number[];
  }> = row[`${mlResultsField}.feature_importance`];
  if (featureImportance === undefined) return [];

  return featureImportance.map((fi) => ({
    feature_name: Array.isArray(fi.feature_name) ? fi.feature_name[0] : fi.feature_name,
    classes: Array.isArray(fi.classes)
      ? fi.classes.map((c) => {
          const processedClass = getProcessedFields(c);
          return {
            importance: processedClass.importance,
            class_name: getClassName(processedClass.class_name, isClassTypeBoolean),
          };
        })
      : fi.classes,
    importance: Array.isArray(fi.importance) ? fi.importance[0] : fi.importance,
  }));
};

/**
 * Helper to transforms top classes fields with arrays back to original primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @returns nested object structure of feature importance values
 */
export const getTopClasses = (row: Record<string, any>, mlResultsField: string): TopClasses => {
  const topClasses: Array<{
    class_name: FeatureImportanceClassName[];
    class_probability: number[];
    class_score: number[];
  }> = row[`${mlResultsField}.top_classes`];

  if (topClasses === undefined) return [];
  return topClasses.map((tc) => getProcessedFields(tc)) as TopClasses;
};

export const useRenderCellValue = (
  indexPattern: DataView | undefined,
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

      let format: ReturnType<typeof mlFieldFormatService.getFieldFormatFromIndexPattern>;

      if (indexPattern !== undefined) {
        format = mlFieldFormatService.getFieldFormatFromIndexPattern(indexPattern, columnId, '');
      }

      function getCellValue(cId: string) {
        if (tableItems.hasOwnProperty(adjustedRowIndex)) {
          const item = tableItems[adjustedRowIndex];

          // Try if the field name is available as is.
          if (item.hasOwnProperty(cId)) {
            return item[cId];
          }

          // For classification and regression results, we need to treat some fields with a custom transform.
          if (cId === `${resultsField}.feature_importance`) {
            return getFeatureImportance(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
          }

          if (cId === `${resultsField}.top_classes`) {
            return getTopClasses(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
          }

          // Try if the field name is available as a nested field.
          return getNestedProperty(tableItems[adjustedRowIndex], cId, null);
        }

        return null;
      }

      const cellValue = getCellValue(columnId);

      // React by default doesn't allow us to use a hook in a callback.
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

      return cellValue;
    };
  }, [indexPattern?.fields, pagination.pageIndex, pagination.pageSize, tableItems]);
  return renderCellValue;
};

// Value can be nested or the fieldName itself might contain other special characters like `.`
export const getNestedOrEscapedVal = (obj: any, sortId: string) =>
  getNestedProperty(obj, sortId, null) ?? obj[sortId];

export interface MultiColumnSorter {
  id: string;
  direction: 'asc' | 'desc';
  type: string;
}

/**
 * Helper to sort an array of objects based on an EuiDataGrid sorting configuration.
 * `sortFn()` is recursive to support sorting on multiple columns.
 *
 * @param sortingColumns - The EUI data grid sorting configuration
 * @returns The sorting function which can be used with an array's sort() function.
 */
export const multiColumnSortFactory = (sortingColumns: MultiColumnSorter[]) => {
  const sortFn = (a: any, b: any, sortingColumnIndex = 0): number => {
    const sort = sortingColumns[sortingColumnIndex];

    // Value can be nested or the fieldName itself might contain `.`
    let aValue = getNestedOrEscapedVal(a, sort.id);
    let bValue = getNestedOrEscapedVal(b, sort.id);

    if (sort.type === 'number') {
      aValue = aValue ?? 0;
      bValue = bValue ?? 0;
      if (aValue < bValue) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (sort.type === 'string') {
      aValue = aValue ?? '';
      bValue = bValue ?? '';

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

// helper function to transform { [key]: [val] } => { [key]: val }
// for when `fields` is used in es.search since response is always an array of values
// since response always returns an array of values for each field
export const getProcessedFields = (originalObj: object, omitBy?: (key: string) => boolean) => {
  const obj: { [key: string]: any } = { ...originalObj };
  for (const key of Object.keys(obj)) {
    // if no conditional is included, process everything
    if (omitBy === undefined) {
      if (Array.isArray(obj[key]) && obj[key].length === 1) {
        obj[key] = obj[key][0];
      }
    } else {
      // else only process the fields for things users don't want to omit
      if (omitBy(key) === false)
        if (Array.isArray(obj[key]) && obj[key].length === 1) {
          obj[key] = obj[key][0];
        }
    }
  }
  return obj;
};
