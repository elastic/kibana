/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType } from '../types';
import { IndexPatternPrivateState, IndexPattern, IndexPatternLayer } from './types';
import { DraggedField } from './indexpattern';
import {
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
} from './operations/definitions/column_types';
import { operationDefinitionMap, OperationType } from './operations';

/**
 * Normalizes the specified operation type. (e.g. document operations
 * produce 'number')
 */
export function normalizeOperationDataType(type: DataType) {
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

export function hasInvalidReference(state: IndexPatternPrivateState) {
  return getInvalidReferences(state).length > 0;
}

export function getInvalidReferences(state: IndexPatternPrivateState) {
  return Object.values(state.layers).filter((layer) => {
    return layer.columnOrder.some((columnId) => {
      const column = layer.columns[columnId];
      return (
        hasField(column) &&
        fieldIsInvalid(
          column.sourceField,
          column.operationType,
          state.indexPatterns[layer.indexPatternId]
        )
      );
    });
  });
}

export function getInvalidFieldReferencesForLayer(
  layers: IndexPatternLayer[],
  indexPatternMap: Record<string, IndexPattern>
) {
  return layers.map((layer) => {
    return layer.columnOrder.filter((columnId) => {
      const column = layer.columns[columnId];
      return (
        hasField(column) &&
        fieldIsInvalid(
          column.sourceField,
          column.operationType,
          indexPatternMap[layer.indexPatternId]
        )
      );
    });
  });
}

export function fieldIsInvalid(
  sourceField: string | undefined,
  operationType: OperationType | undefined,
  indexPattern: IndexPattern
) {
  const operationDefinition = operationType && operationDefinitionMap[operationType];
  const field = sourceField ? indexPattern.getFieldByName(sourceField) : undefined;

  return Boolean(
    sourceField &&
      operationDefinition &&
      !(
        field &&
        operationDefinition?.input === 'field' &&
        operationDefinition.getPossibleOperationForField(field) !== undefined
      )
  );
}
