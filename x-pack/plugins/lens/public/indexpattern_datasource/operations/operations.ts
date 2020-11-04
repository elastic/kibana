/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { OperationMetadata } from '../../types';
import {
  operationDefinitionMap,
  operationDefinitions,
  GenericOperationDefinition,
  OperationType,
} from './definitions';
import { IndexPattern, IndexPatternField } from '../types';
import { documentField } from '../document_field';

export { operationDefinitionMap } from './definitions';

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

/**
 * Returns all `OperationType`s that can build a column using `buildColumn` based on the
 * passed in field.
 */
export function getOperationTypesForField(field: IndexPatternField): OperationType[] {
  return operationDefinitions
    .filter(
      (operationDefinition) =>
        operationDefinition.input === 'field' &&
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

type OperationFieldTuple =
  | {
      type: 'field';
      operationType: OperationType;
      field: string;
    }
  | {
      type: 'none';
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
    }
  });

  return Object.values(operationByMetadata);
}
