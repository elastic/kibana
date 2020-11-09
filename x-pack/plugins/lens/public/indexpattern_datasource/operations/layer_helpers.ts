/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { partition } from 'lodash';
import {
  operationDefinitionMap,
  operationDefinitions,
  OperationType,
  IndexPatternColumn,
} from './definitions';
import {
  IndexPattern,
  IndexPatternField,
  IndexPatternLayer,
  IndexPatternPrivateState,
} from '../types';
import { getSortScoreByPriority } from './operations';
import { mergeLayer } from '../state_helpers';

interface ColumnChange {
  op: OperationType;
  layer: IndexPatternLayer;
  columnId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
}

export function insertOrReplaceColumn(args: ColumnChange): IndexPatternLayer {
  if (args.layer.columns[args.columnId]) {
    return replaceColumn(args);
  }
  return insertNewColumn(args);
}

export function insertNewColumn({
  op,
  layer,
  columnId,
  field,
  indexPattern,
}: ColumnChange): IndexPatternLayer {
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
    const possibleOperation = operationDefinition.getPossibleOperation();
    if (!possibleOperation) {
      throw new Error('Tried to create an invalid operation');
    }
    const isBucketed = Boolean(possibleOperation.isBucketed);
    if (isBucketed) {
      return addBucket(layer, operationDefinition.buildColumn(baseOptions), columnId);
    } else {
      return addMetric(layer, operationDefinition.buildColumn(baseOptions), columnId);
    }
  }

  if (!field) {
    throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
  }

  const possibleOperation = operationDefinition.getPossibleOperationForField(field);
  if (!possibleOperation) {
    throw new Error(
      `Tried to create an invalid operation ${operationDefinition.type} on ${field.name}`
    );
  }
  const isBucketed = Boolean(possibleOperation.isBucketed);
  if (isBucketed) {
    return addBucket(layer, operationDefinition.buildColumn({ ...baseOptions, field }), columnId);
  } else {
    return addMetric(layer, operationDefinition.buildColumn({ ...baseOptions, field }), columnId);
  }
}

export function replaceColumn({
  layer,
  columnId,
  indexPattern,
  op,
  field,
}: ColumnChange): IndexPatternLayer {
  const previousColumn = layer.columns[columnId];
  if (!previousColumn) {
    throw new Error(`Can't replace column because there is no prior column`);
  }

  const isNewOperation = Boolean(op) && op !== previousColumn.operationType;
  const operationDefinition = operationDefinitionMap[op || previousColumn.operationType];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  const baseOptions = {
    columns: layer.columns,
    indexPattern,
    previousColumn,
  };

  if (isNewOperation) {
    // TODO: Reference based operations require more setup to create the references

    if (operationDefinition.input === 'none') {
      const newColumn = operationDefinition.buildColumn(baseOptions);

      if (previousColumn.customLabel) {
        newColumn.customLabel = true;
        newColumn.label = previousColumn.label;
      }

      return {
        ...layer,
        columns: adjustColumnReferencesForChangedColumn(
          { ...layer.columns, [columnId]: newColumn },
          columnId
        ),
      };
    }

    if (!field) {
      throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
    }

    const newColumn = operationDefinition.buildColumn({ ...baseOptions, field });

    if (previousColumn.customLabel) {
      newColumn.customLabel = true;
      newColumn.label = previousColumn.label;
    }

    const newColumns = { ...layer.columns, [columnId]: newColumn };
    return {
      ...layer,
      columnOrder: getColumnOrder({ ...layer, columns: newColumns }),
      columns: adjustColumnReferencesForChangedColumn(newColumns, columnId),
    };
  } else if (
    operationDefinition.input === 'field' &&
    field &&
    'sourceField' in previousColumn &&
    previousColumn.sourceField !== field.name
  ) {
    // Same operation, new field
    const newColumn = operationDefinition.onFieldChange(previousColumn, field);

    if (previousColumn.customLabel) {
      newColumn.customLabel = true;
      newColumn.label = previousColumn.label;
    }

    const newColumns = { ...layer.columns, [columnId]: newColumn };
    return {
      ...layer,
      columnOrder: getColumnOrder({ ...layer, columns: newColumns }),
      columns: adjustColumnReferencesForChangedColumn(newColumns, columnId),
    };
  } else {
    throw new Error('nothing changed');
  }
}

function addBucket(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const [buckets, metrics] = separateBucketColumns(layer);

  const oldDateHistogramIndex = layer.columnOrder.findIndex(
    (columnId) => layer.columns[columnId].operationType === 'date_histogram'
  );

  let updatedColumnOrder: string[] = [];
  if (oldDateHistogramIndex > -1 && column.operationType === 'terms') {
    // Insert the new terms bucket above the first date histogram
    updatedColumnOrder = [
      ...buckets.slice(0, oldDateHistogramIndex),
      addedColumnId,
      ...buckets.slice(oldDateHistogramIndex, buckets.length),
      ...metrics,
    ];
  } else {
    // Insert the new bucket after existing buckets. Users will see the same data
    // they already had, with an extra level of detail.
    updatedColumnOrder = [...buckets, addedColumnId, ...metrics];
  }
  return {
    ...layer,
    columns: { ...layer.columns, [addedColumnId]: column },
    columnOrder: updatedColumnOrder,
  };
}

function addMetric(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [addedColumnId]: column,
    },
    columnOrder: [...layer.columnOrder, addedColumnId],
  };
}

function separateBucketColumns(layer: IndexPatternLayer) {
  return partition(layer.columnOrder, (columnId) => layer.columns[columnId]?.isBucketed);
}

export function getMetricOperationTypes(field: IndexPatternField) {
  return operationDefinitions.sort(getSortScoreByPriority).filter((definition) => {
    if (definition.input !== 'field') return;
    const metadata = definition.getPossibleOperationForField(field);
    return metadata && !metadata.isBucketed && metadata.dataType === 'number';
  });
}

export function updateColumnParam<C extends IndexPatternColumn>({
  state,
  layerId,
  currentColumn,
  paramName,
  value,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  currentColumn: C;
  paramName: string;
  value: unknown;
}): IndexPatternPrivateState {
  const columnId = Object.entries(state.layers[layerId].columns).find(
    ([_columnId, column]) => column === currentColumn
  )![0];

  const layer = state.layers[layerId];

  return mergeLayer({
    state,
    layerId,
    newLayer: {
      columns: {
        ...layer.columns,
        [columnId]: {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            [paramName]: value,
          },
        },
      },
    },
  });
}

function adjustColumnReferencesForChangedColumn(
  columns: Record<string, IndexPatternColumn>,
  columnId: string
) {
  const newColumns = { ...columns };
  Object.keys(newColumns).forEach((currentColumnId) => {
    if (currentColumnId !== columnId) {
      const currentColumn = newColumns[currentColumnId];
      const operationDefinition = operationDefinitionMap[currentColumn.operationType];
      newColumns[currentColumnId] = operationDefinition.onOtherColumnChanged
        ? operationDefinition.onOtherColumnChanged(currentColumn, newColumns)
        : currentColumn;
    }
  });
  return newColumns;
}

export function deleteColumn({
  layer,
  columnId,
}: {
  layer: IndexPatternLayer;
  columnId: string;
}): IndexPatternLayer {
  const hypotheticalColumns = { ...layer.columns };
  delete hypotheticalColumns[columnId];

  const newLayer = {
    ...layer,
    columns: adjustColumnReferencesForChangedColumn(hypotheticalColumns, columnId),
  };
  return { ...newLayer, columnOrder: getColumnOrder(newLayer) };
}

export function getColumnOrder(layer: IndexPatternLayer): string[] {
  const [aggregations, metrics] = _.partition(
    Object.entries(layer.columns),
    ([id, col]) => col.isBucketed
  );

  return aggregations.map(([id]) => id).concat(metrics.map(([id]) => id));
}

/**
 * Returns true if the given column can be applied to the given index pattern
 */
export function isColumnTransferable(column: IndexPatternColumn, newIndexPattern: IndexPattern) {
  return operationDefinitionMap[column.operationType].isTransferable(column, newIndexPattern);
}

export function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const keptColumns: IndexPatternLayer['columns'] = _.pickBy(layer.columns, (column) =>
    isColumnTransferable(column, newIndexPattern)
  );
  const newColumns: IndexPatternLayer['columns'] = _.mapValues(keptColumns, (column) => {
    const operationDefinition = operationDefinitionMap[column.operationType];
    return operationDefinition.transfer
      ? operationDefinition.transfer(column, newIndexPattern)
      : column;
  });
  const newColumnOrder = layer.columnOrder.filter((columnId) => newColumns[columnId]);

  return {
    ...layer,
    indexPatternId: newIndexPattern.id,
    columns: newColumns,
    columnOrder: newColumnOrder,
  };
}
