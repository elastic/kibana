/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DatasourceDimensionDropHandlerProps, DraggedOperation } from '../../../types';
import {
  insertOrReplaceColumn,
  deleteColumn,
  getColumnOrder,
  reorderByGroups,
  copyColumn,
  hasOperationSupportForMultipleFields,
  getOperationHelperForMultipleFields,
  replaceColumn,
} from '../../operations';
import { mergeLayer } from '../../state_helpers';
import { isDraggedField } from '../../pure_utils';
import { getNewOperation, getField } from './get_drop_props';
import { IndexPatternPrivateState, DraggedField } from '../../types';
import { trackUiEvent } from '../../../lens_ui_telemetry';

type DropHandlerProps<T> = DatasourceDimensionDropHandlerProps<IndexPatternPrivateState> & {
  droppedItem: T;
};

export function onDrop(props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>) {
  const { droppedItem, dropType } = props;

  if (dropType === 'field_add' || dropType === 'field_replace' || dropType === 'field_combine') {
    return operationOnDropMap[dropType]({
      ...props,
      droppedItem: droppedItem as DraggedField,
    });
  }
  return operationOnDropMap[dropType]({
    ...props,
    droppedItem: droppedItem as DraggedOperation,
  });
}

const operationOnDropMap = {
  field_add: onFieldDrop,
  field_replace: onFieldDrop,
  field_combine: (props: DropHandlerProps<DraggedField>) => onFieldDrop(props, true),

  reorder: onReorder,

  move_compatible: (props: DropHandlerProps<DraggedOperation>) => onMoveCompatible(props, true),
  replace_compatible: (props: DropHandlerProps<DraggedOperation>) => onMoveCompatible(props, true),
  duplicate_compatible: onMoveCompatible,
  replace_duplicate_compatible: onMoveCompatible,

  move_incompatible: (props: DropHandlerProps<DraggedOperation>) => onMoveIncompatible(props, true),
  replace_incompatible: (props: DropHandlerProps<DraggedOperation>) =>
    onMoveIncompatible(props, true),
  duplicate_incompatible: onMoveIncompatible,
  replace_duplicate_incompatible: onMoveIncompatible,

  swap_compatible: onSwapCompatible,
  swap_incompatible: onSwapIncompatible,
  combine_compatible: onCombineCompatible,
  combine_incompatible: onCombineCompatible,
};

function onCombineCompatible({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  dimensionGroups,
  groupId,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];
  const sourceId = droppedItem.columnId;
  const targetId = columnId;
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const sourceColumn = layer.columns[sourceId];
  const targetColumn = layer.columns[targetId];

  // extract the field from the source column
  const sourceField = getField(sourceColumn, indexPattern);
  const targetField = getField(targetColumn, indexPattern);
  if (!sourceField || !targetField) {
    return false;
  }
  // pass it to the target column and delete the source column
  const initialParams = {
    params:
      getOperationHelperForMultipleFields(targetColumn.operationType)?.({
        targetColumn,
        sourceColumn,
        indexPattern,
      }) ?? {},
  };

  const modifiedLayer = replaceColumn({
    layer,
    columnId,
    indexPattern,
    op: targetColumn.operationType,
    field: targetField,
    visualizationGroups: dimensionGroups,
    targetGroup: groupId,
    initialParams,
    shouldCombineField: true,
  });
  const newLayer = deleteColumn({
    layer: modifiedLayer,
    columnId: sourceId,
    indexPattern,
  });

  // Time to replace
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer,
    })
  );

  return { deleted: sourceId };
}

function onFieldDrop(props: DropHandlerProps<DraggedField>, shouldAddField?: boolean) {
  const {
    columnId,
    setState,
    state,
    layerId,
    droppedItem,
    filterOperations,
    groupId,
    dimensionGroups,
  } = props;

  const prioritizedOperation = dimensionGroups.find(
    (g) => g.groupId === groupId
  )?.prioritizedOperation;

  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const targetColumn = layer.columns[columnId];
  const newOperation = shouldAddField
    ? targetColumn.operationType
    : getNewOperation(droppedItem.field, filterOperations, targetColumn, prioritizedOperation);

  if (
    !isDraggedField(droppedItem) ||
    !newOperation ||
    (shouldAddField &&
      !hasOperationSupportForMultipleFields(
        indexPattern,
        targetColumn,
        undefined,
        droppedItem.field
      ))
  ) {
    return false;
  }
  const field = shouldAddField ? getField(targetColumn, indexPattern) : droppedItem.field;
  const initialParams = shouldAddField
    ? {
        params:
          getOperationHelperForMultipleFields(targetColumn.operationType)?.({
            targetColumn,
            field: droppedItem.field,
            indexPattern,
          }) || {},
      }
    : undefined;

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId,
    indexPattern,
    op: newOperation,
    field,
    visualizationGroups: dimensionGroups,
    targetGroup: groupId,
    shouldCombineField: shouldAddField,
    initialParams,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(mergeLayer({ state, layerId, newLayer }));
  return true;
}

function onMoveCompatible(
  {
    columnId,
    setState,
    state,
    layerId,
    droppedItem,
    dimensionGroups,
    groupId,
  }: DropHandlerProps<DraggedOperation>,
  shouldDeleteSource?: boolean
) {
  const layer = state.layers[layerId];
  const sourceColumn = layer.columns[droppedItem.columnId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];

  const modifiedLayer = copyColumn({
    layer,
    targetId: columnId,
    sourceColumnId: droppedItem.columnId,
    sourceColumn,
    shouldDeleteSource,
    indexPattern,
  });

  const updatedColumnOrder = reorderByGroups(
    dimensionGroups,
    groupId,
    getColumnOrder(modifiedLayer),
    columnId
  );

  // Time to replace
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: updatedColumnOrder,
        columns: modifiedLayer.columns,
      },
    })
  );
  return shouldDeleteSource ? { deleted: droppedItem.columnId } : true;
}

function onReorder({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps<DraggedOperation>) {
  function reorderElements(items: string[], dest: string, src: string) {
    const result = items.filter((c) => c !== src);
    const targetIndex = items.findIndex((c) => c === src);
    const sourceIndex = items.findIndex((c) => c === dest);

    const targetPosition = result.indexOf(dest);
    result.splice(targetIndex < sourceIndex ? targetPosition + 1 : targetPosition, 0, src);
    return result;
  }

  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: reorderElements(
          state.layers[layerId].columnOrder,
          columnId,
          droppedItem.columnId
        ),
      },
    })
  );
  return true;
}

function onMoveIncompatible(
  {
    columnId,
    setState,
    state,
    layerId,
    droppedItem,
    filterOperations,
    dimensionGroups,
    groupId,
  }: DropHandlerProps<DraggedOperation>,
  shouldDeleteSource?: boolean
) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const sourceColumn = layer.columns[droppedItem.columnId];
  const targetColumn = layer.columns[columnId] || null;

  const sourceField = getField(sourceColumn, indexPattern);
  const newOperation = getNewOperation(sourceField, filterOperations, targetColumn);
  if (!newOperation) {
    return false;
  }

  const modifiedLayer = shouldDeleteSource
    ? deleteColumn({
        layer,
        columnId: droppedItem.columnId,
        indexPattern,
      })
    : layer;

  const newLayer = insertOrReplaceColumn({
    layer: modifiedLayer,
    columnId,
    indexPattern,
    op: newOperation,
    field: sourceField,
    visualizationGroups: dimensionGroups,
    targetGroup: groupId,
    shouldResetLabel: true,
  });

  trackUiEvent('drop_onto_dimension');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer,
    })
  );
  return shouldDeleteSource ? { deleted: droppedItem.columnId } : true;
}

function onSwapIncompatible({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  filterOperations,
  dimensionGroups,
  groupId,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const sourceColumn = layer.columns[droppedItem.columnId];
  const targetColumn = layer.columns[columnId];

  const sourceField = getField(sourceColumn, indexPattern);
  const targetField = getField(targetColumn, indexPattern);

  const newOperationForSource = getNewOperation(sourceField, filterOperations, targetColumn);
  const newOperationForTarget = getNewOperation(
    targetField,
    droppedItem.filterOperations,
    sourceColumn
  );

  if (!newOperationForSource || !newOperationForTarget) {
    return false;
  }

  const newLayer = insertOrReplaceColumn({
    layer: insertOrReplaceColumn({
      layer,
      columnId,
      targetGroup: groupId,
      indexPattern,
      op: newOperationForSource,
      field: sourceField,
      visualizationGroups: dimensionGroups,
      shouldResetLabel: true,
    }),
    columnId: droppedItem.columnId,
    indexPattern,
    op: newOperationForTarget,
    field: targetField,
    visualizationGroups: dimensionGroups,
    targetGroup: droppedItem.groupId,
    shouldResetLabel: true,
  });

  trackUiEvent('drop_onto_dimension');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer,
    })
  );
  return true;
}

const swapColumnOrder = (columnOrder: string[], sourceId: string, targetId: string) => {
  const newColumnOrder = [...columnOrder];
  const sourceIndex = newColumnOrder.findIndex((c) => c === sourceId);
  const targetIndex = newColumnOrder.findIndex((c) => c === targetId);

  newColumnOrder[sourceIndex] = targetId;
  newColumnOrder[targetIndex] = sourceId;

  return newColumnOrder;
};

function onSwapCompatible({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  dimensionGroups,
  groupId,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];
  const sourceId = droppedItem.columnId;
  const targetId = columnId;

  const sourceColumn = { ...layer.columns[sourceId] };
  const targetColumn = { ...layer.columns[targetId] };
  const newColumns = { ...layer.columns };
  newColumns[targetId] = sourceColumn;
  newColumns[sourceId] = targetColumn;

  let updatedColumnOrder = swapColumnOrder(layer.columnOrder, sourceId, targetId);
  updatedColumnOrder = reorderByGroups(dimensionGroups, groupId, updatedColumnOrder, columnId);

  // Time to replace
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: updatedColumnOrder,
        columns: newColumns,
      },
    })
  );

  return true;
}
