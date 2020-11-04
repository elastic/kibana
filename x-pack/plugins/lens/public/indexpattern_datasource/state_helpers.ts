/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { isColumnTransferable, operationDefinitionMap, IndexPatternColumn } from './operations';
import { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from './types';

export function updateColumnParam<C extends IndexPatternColumn, K extends keyof C['params']>({
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

export function changeColumn<C extends IndexPatternColumn>({
  state,
  layerId,
  columnId,
  newColumn,
  keepParams = true,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  columnId: string;
  newColumn: C;
  keepParams?: boolean;
}): IndexPatternPrivateState {
  const oldColumn = state.layers[layerId].columns[columnId];

  const updatedColumn =
    keepParams &&
    oldColumn &&
    oldColumn.operationType === newColumn.operationType &&
    'params' in oldColumn
      ? { ...newColumn, params: oldColumn.params }
      : newColumn;

  if (oldColumn && oldColumn.customLabel) {
    updatedColumn.customLabel = true;
    updatedColumn.label = oldColumn.label;
  }

  const layer = {
    ...state.layers[layerId],
  };

  const newColumns = adjustColumnReferencesForChangedColumn(
    {
      ...layer.columns,
      [columnId]: updatedColumn,
    },
    columnId
  );

  return mergeLayer({
    state,
    layerId,
    newLayer: {
      columnOrder: getColumnOrder({
        ...layer,
        columns: newColumns,
      }),
      columns: newColumns,
    },
  });
}

export function deleteColumn({
  state,
  layerId,
  columnId,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  columnId: string;
}): IndexPatternPrivateState {
  const hypotheticalColumns = { ...state.layers[layerId].columns };
  delete hypotheticalColumns[columnId];

  const newColumns = adjustColumnReferencesForChangedColumn(hypotheticalColumns, columnId);
  const layer = {
    ...state.layers[layerId],
    columns: newColumns,
  };

  return mergeLayer({
    state,
    layerId,
    newLayer: {
      ...layer,
      columnOrder: getColumnOrder(layer),
    },
  });
}

export function getColumnOrder(layer: IndexPatternLayer): string[] {
  const [aggregations, metrics] = _.partition(
    Object.entries(layer.columns),
    ([id, col]) => col.isBucketed
  );

  return aggregations.map(([id]) => id).concat(metrics.map(([id]) => id));
}

export function mergeLayer({
  state,
  layerId,
  newLayer,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  newLayer: Partial<IndexPatternLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: { ...state.layers[layerId], ...newLayer },
    },
  };
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
