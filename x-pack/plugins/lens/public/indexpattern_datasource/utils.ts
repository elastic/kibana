/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataType } from '../types';
import { IndexPattern, IndexPatternLayer, DraggedField } from './types';
import type {
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from './operations/definitions/column_types';
import { operationDefinitionMap, IndexPatternColumn } from './operations';

import { getInvalidFieldMessage } from './operations/definitions/helpers';
import { isQueryValid } from './operations/definitions/filters';

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

export function isColumnInvalid(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const column: IndexPatternColumn | undefined = layer.columns[columnId];
  if (!column) return;

  const operationDefinition = column.operationType && operationDefinitionMap[column.operationType];
  // check also references for errors
  const referencesHaveErrors =
    true &&
    'references' in column &&
    Boolean(getReferencesErrors(layer, column, indexPattern).filter(Boolean).length);

  const operationErrorMessages = operationDefinition.getErrorMessage?.(
    layer,
    columnId,
    indexPattern,
    operationDefinitionMap
  );

  const filterHasError = column.filter ? !isQueryValid(column.filter, indexPattern) : false;

  return (
    (operationErrorMessages && operationErrorMessages.length > 0) ||
    referencesHaveErrors ||
    filterHasError
  );
}

function getReferencesErrors(
  layer: IndexPatternLayer,
  column: ReferenceBasedIndexPatternColumn,
  indexPattern: IndexPattern
) {
  return column.references?.map((referenceId: string) => {
    const referencedOperation = layer.columns[referenceId]?.operationType;
    const referencedDefinition = operationDefinitionMap[referencedOperation];
    return referencedDefinition?.getErrorMessage?.(
      layer,
      referenceId,
      indexPattern,
      operationDefinitionMap
    );
  });
}

export function fieldIsInvalid(column: IndexPatternColumn | undefined, indexPattern: IndexPattern) {
  if (!column || !hasField(column)) {
    return false;
  }
  return !!getInvalidFieldMessage(column, indexPattern)?.length;
}
