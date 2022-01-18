/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataType } from '../types';
import type { DraggedField, IndexPatternLayer } from './types';
import type {
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
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

export function isReferenced(layer: IndexPatternLayer, columnId: string): boolean {
  const allReferences = Object.values(layer.columns).flatMap((col) =>
    'references' in col ? col.references : []
  );
  return allReferences.includes(columnId);
}

export function isSortableByColumn(
  layer: IndexPatternLayer,
  columnId: string,
  allowReferenceColumns: boolean = false
) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    column.operationType !== 'last_value' &&
    (allowReferenceColumns || !('references' in column)) &&
    !isReferenced(layer, columnId)
  );
}
