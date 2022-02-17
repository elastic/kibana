/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { OperationMetadata } from '../../types';
import {
  operationDefinitionMap,
  operationDefinitions,
  GenericOperationDefinition,
  OperationType,
  renameOperationsMapping,
  BaseIndexPatternColumn,
} from './definitions';
import { IndexPattern, IndexPatternField } from '../types';
import { documentField } from '../document_field';
import { hasField } from '../pure_utils';

export { operationDefinitionMap } from './definitions';
/**
 * Map aggregation names from Elasticsearch to Lens names.
 * Used when loading indexpatterns to map metadata (i.e. restrictions)
 */
export function translateToOperationName(agg: string): OperationType {
  return agg in renameOperationsMapping ? renameOperationsMapping[agg] : (agg as OperationType);
}
/**
 * Returns all available operation types as a list at runtime.
 * This will be an array of each member of the union type `OperationType`
 * without any guaranteed order
 */
export function getOperations(): OperationType[] {
  return Object.keys(operationDefinitionMap) as OperationType[];
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

export function getSortScoreByPriority(
  a: GenericOperationDefinition,
  b: GenericOperationDefinition
) {
  return (b.priority || Number.NEGATIVE_INFINITY) - (a.priority || Number.NEGATIVE_INFINITY);
}

export function getCurrentFieldsForOperation(targetColumn: BaseIndexPatternColumn) {
  if (!hasField(targetColumn)) {
    return [];
  }
  return (
    operationDefinitionMap[targetColumn.operationType]?.getCurrentFields?.(targetColumn) ?? [
      targetColumn.sourceField,
    ]
  );
}

export function getOperationHelperForMultipleFields(operationType: string) {
  return operationDefinitionMap[operationType]?.getParamsForMultipleFields;
}

export function hasOperationSupportForMultipleFields(
  indexPattern: IndexPattern,
  targetColumn: BaseIndexPatternColumn,
  sourceColumn?: BaseIndexPatternColumn,
  field?: IndexPatternField
) {
  return Boolean(
    operationDefinitionMap[targetColumn.operationType]?.canAddNewField?.({
      targetColumn,
      sourceColumn,
      field,
      indexPattern,
    })
  );
}

/**
 * Returns all `OperationType`s that can build a column using `buildColumn` based on the
 * passed in field.
 */
export function getOperationTypesForField(
  field: IndexPatternField,
  filterOperations?: (operation: OperationMetadata) => boolean
): OperationType[] {
  return operationDefinitions
    .filter((operationDefinition) => {
      if (operationDefinition.input !== 'field') {
        return false;
      }
      const possibleOperation = operationDefinition.getPossibleOperationForField(field);
      return filterOperations
        ? possibleOperation && filterOperations(possibleOperation)
        : possibleOperation;
    })
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

export type OperationFieldTuple =
  | {
      type: 'field';
      operationType: OperationType;
      field: string;
    }
  | {
      type: 'none';
      operationType: OperationType;
    }
  | {
      type: 'fullReference';
      operationType: OperationType;
    }
  | {
      type: 'managedReference';
      operationType: OperationType;
    };

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
 *      operations: [{
 *        type: 'field',
 *        operationType: ['terms'],
 *        field: 'keyword'
 *      }]
 *    },
 *    {
 *      operationMetaData: { dataType: 'string', isBucketed: true },
 *      operations: [{
 *        type: 'none',
 *        operationType: ['filters'],
 *      }]
 *    },
 * ]
 * ```
 */
export function getAvailableOperationsByMetadata(
  indexPattern: IndexPattern,
  // For consistency in testing
  customOperationDefinitionMap?: Record<string, GenericOperationDefinition>
) {
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

  (customOperationDefinitionMap
    ? Object.values(customOperationDefinitionMap)
    : operationDefinitions
  )
    .sort(getSortScoreByPriority)
    .forEach((operationDefinition) => {
      if (operationDefinition.input === 'field') {
        indexPattern.fields.forEach((field) => {
          addToMap(
            {
              type: 'field',
              operationType: operationDefinition.type,
              field: field.name,
            },
            operationDefinition.getPossibleOperationForField(field)
          );
        });
      } else if (operationDefinition.input === 'none') {
        addToMap(
          {
            type: 'none',
            operationType: operationDefinition.type,
          },
          operationDefinition.getPossibleOperation()
        );
      } else if (operationDefinition.input === 'fullReference') {
        const validOperation = operationDefinition.getPossibleOperation(indexPattern);
        if (validOperation) {
          addToMap(
            { type: 'fullReference', operationType: operationDefinition.type },
            validOperation
          );
        }
      } else if (operationDefinition.input === 'managedReference') {
        const validOperation = operationDefinition.getPossibleOperation();
        if (validOperation) {
          addToMap(
            { type: 'managedReference', operationType: operationDefinition.type },
            validOperation
          );
        }
      }
    });

  return Object.values(operationByMetadata);
}

export const memoizedGetAvailableOperationsByMetadata = memoize(getAvailableOperationsByMetadata);
