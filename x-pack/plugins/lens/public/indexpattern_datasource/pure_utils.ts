/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataType, IndexPattern, IndexPatternField } from '../types';
import type { DraggedField, IndexPatternLayer } from './types';
import type {
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from './operations/definitions/column_types';

/**
 * Normalizes the specified operation type. (e.g. document operations
 * produce 'number')
 */
export function normalizeOperationDataType(type: DataType) {
  if (type === 'histogram') return 'number';
  return type === 'document' ? 'number' : type;
}

export function hasField(column: BaseIndexPatternColumn): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

export function getFieldType(field: IndexPatternField) {
  if (field.timeSeriesMetricType) {
    return field.timeSeriesMetricType;
  }
  return field.type;
}

export function getReferencedField(
  column: GenericIndexPatternColumn | undefined,
  indexPattern: IndexPattern,
  layer: IndexPatternLayer
) {
  if (!column) return;
  if (!('references' in column)) return;
  const referencedColumn = layer.columns[column.references[0]];
  if (!referencedColumn || !hasField(referencedColumn)) return;
  return indexPattern.getFieldByName(referencedColumn.sourceField);
}

export function sortByField<C extends BaseIndexPatternColumn>(columns: C[]) {
  return [...columns].sort((column1, column2) => {
    if (hasField(column1) && hasField(column2)) {
      return column1.sourceField.localeCompare(column2.sourceField);
    }
    return column1.operationType.localeCompare(column2.operationType);
  });
}

export function isDraggedField(fieldCandidate: unknown): fieldCandidate is DraggedField {
  return (
    typeof fieldCandidate === 'object' &&
    fieldCandidate !== null &&
    ['id', 'field', 'indexPatternId'].every((prop) => prop in fieldCandidate)
  );
}
