/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DimensionPriority, OperationMetadata } from '../../types';
import {
  operationDefinitionMap,
  operationDefinitions,
  GenericOperationDefinition,
  OperationType,
  IndexPatternColumn,
} from './definitions';
import { IndexPattern, IndexPatternField } from '../types';
import { documentField } from '../document_field';

/**
 * Returns all available operation types as a list at runtime.
 * This will be an array of each member of the union type `OperationType`
 * without any guaranteed order
 */
export function getOperations(): OperationType[] {
  return Object.keys(operationDefinitionMap) as OperationType[];
}

/**
 * Returns true if the given column can be applied to the given index pattern
 */
export function isColumnTransferable(column: IndexPatternColumn, newIndexPattern: IndexPattern) {
  return operationDefinitionMap[column.operationType].isTransferable(column, newIndexPattern);
}

/**
 * Returns a list of the display names of all operations with any guaranteed order.
 */
export function getOperationDisplay() {
  const display = {} as Record<
    OperationType,
    {
      type: OperationType;
      displayName: string;
    }
  >;
  operationDefinitions.forEach(({ type, displayName }) => {
    display[type] = {
      type,
      displayName,
    };
  });
  return display;
}

function getSortScoreByPriority(a: GenericOperationDefinition, b: GenericOperationDefinition) {
  return (b.priority || Number.NEGATIVE_INFINITY) - (a.priority || Number.NEGATIVE_INFINITY);
}

/**
 * Returns all `OperationType`s that can build a column using `buildColumn` based on the
 * passed in field.
 */
export function getOperationTypesForField(field: IndexPatternField): OperationType[] {
  return operationDefinitions
    .filter(
      (operationDefinition) =>
        'getPossibleOperationForField' in operationDefinition &&
        operationDefinition.getPossibleOperationForField(field)
    )
    .sort(getSortScoreByPriority)
    .map(({ type }) => type);
}

let documentOperations: Set<string>;

export function isDocumentOperation(type: string) {
  // This can't be done at the root level, because it breaks tests, thanks to mocking oddities
  // so we do it here, and cache the result.
  documentOperations =
    documentOperations || new Set(getOperationTypesForField(documentField) as string[]);
  return documentOperations.has(type);
}

interface OperationFieldTuple {
  type: 'field';
  operationType: OperationType;
  field: string;
}

/**
 * Returns all possible operations (matches between operations and fields of the index
 * pattern plus matches for operations and documents of the index pattern) indexed by the
 * meta data of the operation.
 *
 * The resulting list is filtered down by the `filterOperations` function passed in by
 * the current visualization to determine which operations and field are applicable for
 * a given dimension.
 *
 * Example output:
 * ```
 * [
 *    {
 *      operationMetaData: { dataType: 'string', isBucketed: true },
 *      operations: ['terms']
 *    },
 *    {
 *      operationMetaData: { dataType: 'number', isBucketed: false },
 *      operations: ['avg', 'min', 'max']
 *    },
 * ]
 * ```
 */
export function getAvailableOperationsByMetadata(indexPattern: IndexPattern) {
  const operationByMetadata: Record<
    string,
    { operationMetaData: OperationMetadata; operations: OperationFieldTuple[] }
  > = {};

  const addToMap = (
    operation: OperationFieldTuple,
    operationMetadata: OperationMetadata | undefined | false
  ) => {
    if (!operationMetadata) return;
    const key = JSON.stringify(operationMetadata);

    if (operationByMetadata[key]) {
      operationByMetadata[key].operations.push(operation);
    } else {
      operationByMetadata[key] = {
        operationMetaData: operationMetadata,
        operations: [operation],
      };
    }
  };

  operationDefinitions.sort(getSortScoreByPriority).forEach((operationDefinition) => {
    indexPattern.fields.forEach((field) => {
      addToMap(
        {
          type: 'field',
          operationType: operationDefinition.type,
          field: field.name,
        },
        getPossibleOperationForField(operationDefinition, field)
      );
    });
  });

  return Object.values(operationByMetadata);
}

function getPossibleOperationForField(
  operationDefinition: GenericOperationDefinition,
  field: IndexPatternField
): OperationMetadata | undefined {
  return 'getPossibleOperationForField' in operationDefinition
    ? operationDefinition.getPossibleOperationForField(field)
    : undefined;
}

/**
 * Changes the field of the passed in colum. To do so, this method uses the `onFieldChange` function of
 * the operation definition of the column. Returns a new column object with the field changed.
 * @param column The column object with the old field configured
 * @param indexPattern The index pattern associated to the layer of the column
 * @param newField The new field the column should be switched to
 */
export function changeField(
  column: IndexPatternColumn,
  indexPattern: IndexPattern,
  newField: IndexPatternField
) {
  const operationDefinition = operationDefinitionMap[column.operationType];

  if (!('onFieldChange' in operationDefinition)) {
    throw new Error(
      "Invariant error: Cannot change field if operation isn't a field based operaiton"
    );
  }

  return operationDefinition.onFieldChange(column, indexPattern, newField);
}

/**
 * Builds a column object based on the context passed in. It tries
 * to find the applicable operation definition and then calls the `buildColumn`
 * function of that definition. It passes in the given `field` (if available),
 * `suggestedPriority`, `layerId` and the currently existing `columns`.
 * * If `op` is specified, the specified operation definition is used directly.
 * * If `asDocumentOperation` is true, the first matching document-operation is used.
 * * If `field` is specified, the first matching field based operation applicable to the field is used.
 */
export function buildColumn({
  op,
  columns,
  field,
  layerId,
  indexPattern,
  suggestedPriority,
  previousColumn,
}: {
  op: OperationType;
  columns: Partial<Record<string, IndexPatternColumn>>;
  suggestedPriority: DimensionPriority | undefined;
  layerId: string;
  indexPattern: IndexPattern;
  field: IndexPatternField;
  previousColumn?: IndexPatternColumn;
}): IndexPatternColumn {
  const operationDefinition = operationDefinitionMap[op];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  const baseOptions = {
    columns,
    suggestedPriority,
    layerId,
    indexPattern,
    previousColumn,
  };

  if (!field) {
    throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
  }

  const newColumn = operationDefinition.buildColumn({
    ...baseOptions,
    field,
  });

  return newColumn;
}

export { operationDefinitionMap } from './definitions';
