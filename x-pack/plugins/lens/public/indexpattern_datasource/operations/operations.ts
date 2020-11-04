/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { partition } from 'lodash';
import { OperationMetadata } from '../../types';
import {
  operationDefinitionMap,
  operationDefinitions,
  GenericOperationDefinition,
  OperationType,
  IndexPatternColumn,
} from './definitions';
import { IndexPattern, IndexPatternField, IndexPatternLayer } from '../types';
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

  if (operationDefinition.input === 'field' && 'sourceField' in column) {
    return operationDefinition.onFieldChange(column, indexPattern, newField);
  } else {
    throw new Error(
      "Invariant error: Cannot change field if operation isn't a field based operaiton"
    );
  }
}

/**
 * Builds a column object based on the context passed in. It tries
 * to find the applicable operation definition and then calls the `buildColumn`
 * function of that definition. It passes in the given `field` (if available),
 * and the currently existing `columns`.
 * * If `field` is specified, the first matching field based operation applicable to the field is used.
 */
export function buildColumn({
  op,
  columns,
  field,
  indexPattern,
  previousColumn,
}: {
  op: OperationType;
  columns: Partial<Record<string, IndexPatternColumn>>;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
  previousColumn?: IndexPatternColumn;
}): IndexPatternColumn {
  const operationDefinition = operationDefinitionMap[op];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  const baseOptions = {
    columns,
    indexPattern,
    previousColumn,
  };

  if (operationDefinition.input === 'none') {
    return operationDefinition.buildColumn(baseOptions);
  }

  if (!field) {
    throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
  }

  return operationDefinition.buildColumn({
    ...baseOptions,
    field,
  });
}

export function insertNewColumn({
  op,
  layer,
  columnId,
  field,
  indexPattern,
}: {
  op: OperationType;
  layer: IndexPatternLayer;
  columnId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
}): IndexPatternLayer {
  const operationDefinition = operationDefinitionMap[op];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  const baseOptions = {
    columns: layer.columns,
    indexPattern,
    previousColumn: layer.columns[columnId],
  };

  // TODO: Reference based operations require more setup to create the references

  if (operationDefinition.input === 'none') {
    const isBucketed = Boolean(operationDefinition.getPossibleOperation()?.isBucketed);
    if (isBucketed) {
      return addBucket(layer, operationDefinition.buildColumn(baseOptions), columnId);
    } else {
      return addMetric(layer, operationDefinition.buildColumn(baseOptions), columnId);
    }
  }

  if (!field) {
    throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
  }

  const isBucketed = Boolean(operationDefinition.getPossibleOperationForField(field)?.isBucketed);
  if (isBucketed) {
    return addBucket(layer, operationDefinition.buildColumn({ ...baseOptions, field }), columnId);
  } else {
    return addMetric(layer, operationDefinition.buildColumn({ ...baseOptions, field }), columnId);
  }
}

function addBucket(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const [buckets, metrics] = separateBucketColumns(layer);

  if (buckets.length === 0 && column.operationType === 'terms') {
    column.params.size = 5;
  }

  const updatedColumns = {
    ...layer.columns,
    [addedColumnId]: column,
  };

  const oldDateHistogramIndex = layer.columnOrder.findIndex(
    (columnId) => layer.columns[columnId].operationType === 'date_histogram'
  );
  const oldDateHistogramId =
    oldDateHistogramIndex > -1 ? layer.columnOrder[oldDateHistogramIndex] : null;

  // TODO: Use the logic here more generally during drag and drop suggestions
  let updatedColumnOrder: string[] = [];
  if (oldDateHistogramId) {
    if (column.operationType === 'terms') {
      // Insert the new terms bucket above the first date histogram
      updatedColumnOrder = [
        ...buckets.slice(0, oldDateHistogramIndex),
        addedColumnId,
        ...buckets.slice(oldDateHistogramIndex, buckets.length),
        ...metrics,
      ];
    } else if (column.operationType === 'date_histogram') {
      // Replace date histogram with new date histogram
      delete updatedColumns[oldDateHistogramId];
      updatedColumnOrder = layer.columnOrder.map((columnId) =>
        columnId !== oldDateHistogramId ? columnId : addedColumnId
      );
    }
  } else {
    // Insert the new bucket after existing buckets. Users will see the same data
    // they already had, with an extra level of detail.
    updatedColumnOrder = [...buckets, addedColumnId, ...metrics];
  }
  return {
    ...layer,
    columns: updatedColumns,
    columnOrder: updatedColumnOrder,
  };
}

function addMetric(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const [, metrics] = separateBucketColumns(layer);

  // Add metrics if there are 0 or > 1 metric
  if (metrics.length !== 1) {
    return {
      ...layer,
      columns: {
        ...layer.columns,
        [addedColumnId]: column,
      },
      columnOrder: [...layer.columnOrder, addedColumnId],
    };
  }

  // Replacing old column with new column, keeping the old ID
  const newColumns = { ...layer.columns, [metrics[0]]: column };

  return {
    ...layer,
    columns: newColumns,
    columnOrder: layer.columnOrder, // Order is kept by replacing
  };
}

function separateBucketColumns(layer: IndexPatternLayer) {
  return partition(layer.columnOrder, (columnId) => layer.columns[columnId]?.isBucketed);
}

export function getMetricOperationType(field: IndexPatternField) {
  const match = operationDefinitions.sort(getSortScoreByPriority).find((definition) => {
    if (definition.input !== 'field') return;
    const metadata = definition.getPossibleOperationForField(field);
    if (!metadata) return;
    return (
      !metadata.isBucketed && (metadata.dataType === 'number' || metadata.dataType === 'document')
    );
  });
  return match?.type;
}
