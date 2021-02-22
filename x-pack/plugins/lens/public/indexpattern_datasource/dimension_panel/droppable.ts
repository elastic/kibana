/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DatasourceDimensionDropProps,
  DatasourceDimensionDropHandlerProps,
  isDraggedOperation,
  DraggedOperation,
  DropType,
} from '../../types';
import { IndexPatternColumn } from '../indexpattern';
import {
  insertOrReplaceColumn,
  deleteColumn,
  getOperationTypesForField,
  getColumnOrder,
  reorderByGroups,
  getOperationDisplay,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField, isDraggedField } from '../utils';
import { IndexPatternPrivateState, DraggedField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { DragContextState } from '../../drag_drop/providers';

type DropHandlerProps<T> = DatasourceDimensionDropHandlerProps<IndexPatternPrivateState> & {
  droppedItem: T;
};

const operationLabels = getOperationDisplay();

export function getDropProps(
  props: DatasourceDimensionDropProps<IndexPatternPrivateState> & {
    dragging: DragContextState['dragging'];
    groupId: string;
  }
): { dropTypes: DropType[]; nextLabel?: string } | undefined {
  const { dragging } = props;
  if (!dragging) {
    return;
  }

  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  const currentColumn = props.state.layers[props.layerId].columns[props.columnId];
  if (isDraggedField(dragging)) {
    const operationsForNewField = getOperationTypesForField(dragging.field, props.filterOperations);

    if (!!(layerIndexPatternId === dragging.indexPatternId && operationsForNewField.length)) {
      const highestPriorityOperationLabel = operationLabels[operationsForNewField[0]].displayName;
      if (!currentColumn) {
        return { dropTypes: ['field_add'], nextLabel: highestPriorityOperationLabel };
      } else if (
        (hasField(currentColumn) && currentColumn.sourceField !== dragging.field.name) ||
        !hasField(currentColumn)
      ) {
        const persistingOperationLabel =
          currentColumn &&
          operationsForNewField.includes(currentColumn.operationType) &&
          operationLabels[currentColumn.operationType].displayName;

        return {
          dropTypes: ['field_replace'],
          nextLabel: persistingOperationLabel || highestPriorityOperationLabel,
        };
      }
    }
    return;
  }

  if (
    isDraggedOperation(dragging) &&
    dragging.layerId === props.layerId &&
    props.columnId !== dragging.columnId
  ) {
    // same group
    if (props.groupId === dragging.groupId) {
      if (currentColumn) {
        return { dropTypes: ['reorder'] };
      }
      return { dropTypes: ['duplicate_in_group'] };
    }

    // compatible group
    const op = props.state.layers[dragging.layerId].columns[dragging.columnId];
    if (
      !op ||
      (currentColumn &&
        hasField(currentColumn) &&
        hasField(op) &&
        currentColumn.sourceField === op.sourceField)
    ) {
      return;
    }
    if (props.filterOperations(op)) {
      if (currentColumn) {
        return {
          dropTypes: ['replace_compatible', 'swap_compatible', 'replace_duplicate_compatible'],
        };
      } else {
        return { dropTypes: ['move_compatible', 'duplicate_compatible'] };
      }
    }

    // suggest
    const draggingField =
      hasField(op) && props.state.indexPatterns[layerIndexPatternId].getFieldByName(op.sourceField);
    const operationsForDraggingField =
      draggingField && getOperationTypesForField(draggingField, props.filterOperations);

    if (operationsForDraggingField && operationsForDraggingField?.length) {
      const highestPriorityOperationLabel =
        operationLabels[operationsForDraggingField[0]].displayName;

      if (currentColumn) {
        const persistingOperationLabel =
          currentColumn &&
          operationsForDraggingField.includes(currentColumn.operationType) &&
          operationLabels[currentColumn.operationType].displayName;

        // swap check
        const dropOp = props.state.layers[props.layerId].columns[props.columnId];
        const dropColField =
          hasField(dropOp) &&
          props.state.indexPatterns[layerIndexPatternId].getFieldByName(dropOp.sourceField);
        const operationsForDropTargetField =
          dropColField && getOperationTypesForField(dropColField, dragging.filterOperations);
        return {
          dropTypes:
            operationsForDropTargetField && operationsForDropTargetField?.length
              ? ['replace_incompatible', 'replace_duplicate_incompatible', 'swap_incompatible']
              : ['replace_incompatible', 'replace_duplicate_incompatible'],
          nextLabel: persistingOperationLabel || highestPriorityOperationLabel,
        };
      } else {
        return {
          dropTypes: ['move_incompatible', 'duplicate_incompatible'],
          nextLabel: highestPriorityOperationLabel,
        };
      }
    }
  }
}

export function onDrop(props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>) {
  const { droppedItem, dropType } = props;

  if (dropType === 'field_add' || dropType === 'field_replace') {
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
  reorder: onReorderDrop,
  duplicate_in_group: onSameGroupDuplicateDrop,
  move_compatible: onMoveDropToCompatibleGroup,
  replace_compatible: onMoveDropToCompatibleGroup,
  move_incompatible: onMoveDropToNonCompatibleGroup,
  replace_incompatible: onMoveDropToNonCompatibleGroup,
  duplicate_incompatible: onDuplicateToNonCompatibleGroup,
  replace_duplicate_incompatible: onDuplicateToNonCompatibleGroup,
  replace_duplicate_compatible: onDuplicateDropToCompatibleGroup,
  duplicate_compatible: onDuplicateDropToCompatibleGroup,

  swap_incompatible: onSwapDropToNonCompatibleGroup,
  swap_compatible: onSwapDropToCompatibleGroup,
};

function reorderElements(items: string[], dest: string, src: string) {
  const result = items.filter((c) => c !== src);
  const destIndex = items.findIndex((c) => c === src);
  const destPosition = result.indexOf(dest);
  const srcIndex = items.findIndex((c) => c === dest);
  result.splice(destIndex < srcIndex ? destPosition + 1 : destPosition, 0, src);
  return result;
}

function onReorderDrop({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps<DraggedOperation>) {
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

function onMoveDropToNonCompatibleGroup(props: DropHandlerProps<DraggedOperation>) {
  const { columnId, setState, state, layerId, droppedItem, dimensionGroups, groupId } = props;

  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
  const field =
    hasField(op) && state.indexPatterns[layer.indexPatternId].getFieldByName(op.sourceField);
  if (!field) {
    return false;
  }

  const operationsForNewField = getOperationTypesForField(field, props.filterOperations);

  if (!operationsForNewField.length) {
    return false;
  }

  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];
  // Detects if we can change the field only, otherwise change field + operation

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;

  const fieldIsCompatibleWithCurrent =
    selectedColumn && operationsForNewField.includes(selectedColumn.operationType);

  const newLayer = insertOrReplaceColumn({
    layer: deleteColumn({
      layer,
      columnId: droppedItem.columnId,
      indexPattern: currentIndexPattern,
    }),
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent ? selectedColumn.operationType : operationsForNewField[0],
    field,
    visualizationGroups: dimensionGroups,
    targetGroup: groupId,
  });

  trackUiEvent('drop_onto_dimension');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        ...newLayer,
      },
    })
  );
  return { deleted: droppedItem.columnId };
}

function onDuplicateToNonCompatibleGroup(props: DropHandlerProps<DraggedOperation>) {
  const { columnId, setState, state, layerId, droppedItem } = props;

  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
  const field =
    hasField(op) && state.indexPatterns[layer.indexPatternId].getFieldByName(op.sourceField);
  if (!field) {
    return false;
  }

  const operationsForNewField = getOperationTypesForField(field, props.filterOperations);

  if (!operationsForNewField.length) {
    return false;
  }

  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];
  // Detects if we can change the field only, otherwise change field + operation

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;

  const fieldIsCompatibleWithCurrent =
    selectedColumn && operationsForNewField.includes(selectedColumn.operationType);

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent ? selectedColumn.operationType : operationsForNewField[0],
    field,
  });

  trackUiEvent('drop_onto_dimension');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        ...newLayer,
      },
    })
  );
  return true;
}

function onSwapDropToNonCompatibleGroup(props: DropHandlerProps<DraggedOperation>) {
  const { columnId, setState, state, layerId, droppedItem } = props;

  const layer = state.layers[layerId];
  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  const droppedItemOp = { ...layer.columns[droppedItem.columnId] };
  const field =
    hasField(droppedItemOp) && currentIndexPattern.getFieldByName(droppedItemOp.sourceField);
  if (!field) {
    return false;
  }

  const operationsForNewField = getOperationTypesForField(field, props.filterOperations);

  if (!operationsForNewField.length) {
    return false;
  }

  // Detects if we can change the field only, otherwise change field + operation

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;

  const fieldIsCompatibleWithCurrent =
    selectedColumn && operationsForNewField.includes(selectedColumn.operationType);

  const newLayer = insertOrReplaceColumn({
    layer: deleteColumn({
      layer,
      columnId: droppedItem.columnId,
      indexPattern: currentIndexPattern,
    }),
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent ? selectedColumn.operationType : operationsForNewField[0],
    field,
  });

  //TO REFACTOR

  const dropTargetOp = { ...layer.columns[columnId] };
  const dropTargetField =
    hasField(dropTargetOp) && currentIndexPattern.getFieldByName(dropTargetOp.sourceField);
  if (!dropTargetField) {
    return false;
  }

  const operationsForNewDropTargetField = getOperationTypesForField(
    dropTargetField,
    props.filterOperations
  );

  if (!operationsForNewDropTargetField.length) {
    return false;
  }

  // Detects if we can change the field only, otherwise change field + operation

  const selectedColumn2: IndexPatternColumn | null = layer.columns[columnId] || null;

  const fieldIsCompatibleWithCurrent2 =
    selectedColumn2 && operationsForNewDropTargetField.includes(selectedColumn2.operationType);

  const newLayer2 = insertOrReplaceColumn({
    layer: deleteColumn({
      layer,
      columnId,
      indexPattern: currentIndexPattern,
    }),
    columnId: droppedItem.columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent2
      ? selectedColumn2.operationType
      : operationsForNewDropTargetField[0],
    field: dropTargetField,
  });
  //

  trackUiEvent('drop_onto_dimension');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: newLayer,
    })
  );
  //TODO!
  return { deleted: droppedItem.columnId };
  return true;
}

function onSameGroupDuplicateDrop({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  dimensionGroups,
  groupId,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];

  const op = { ...layer.columns[droppedItem.columnId] };
  const newColumns = {
    ...layer.columns,
    [columnId]: op,
  };

  const newColumnOrder = [...layer.columnOrder];
  // put a new bucketed dimension just in front of the metric dimensions, a metric dimension in the back of the array
  // then reorder based on dimension groups if necessary
  const insertionIndex = op.isBucketed
    ? newColumnOrder.findIndex((id) => !newColumns[id].isBucketed)
    : newColumnOrder.length;
  newColumnOrder.splice(insertionIndex, 0, columnId);

  const newLayer = {
    ...layer,
    columnOrder: newColumnOrder,
    columns: newColumns,
  };

  const updatedColumnOrder = getColumnOrder(newLayer);

  reorderByGroups(dimensionGroups, groupId, updatedColumnOrder, columnId);

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

function onMoveDropToCompatibleGroup({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  dimensionGroups,
  groupId,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
  const newColumns = { ...layer.columns };
  delete newColumns[droppedItem.columnId];
  newColumns[columnId] = op;

  const newColumnOrder = [...layer.columnOrder];
  const oldIndex = newColumnOrder.findIndex((c) => c === droppedItem.columnId);
  const newIndex = newColumnOrder.findIndex((c) => c === columnId);

  if (newIndex === -1) {
    // for newly created columns, remove the old entry and add the last one to the end
    newColumnOrder.splice(oldIndex, 1);
    newColumnOrder.push(columnId);
  } else {
    // for drop to replace, reuse the same index
    newColumnOrder[oldIndex] = columnId;
  }
  const newLayer = {
    ...layer,
    columnOrder: newColumnOrder,
    columns: newColumns,
  };

  const updatedColumnOrder = getColumnOrder(newLayer);

  reorderByGroups(dimensionGroups, groupId, updatedColumnOrder, columnId);

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
  return { deleted: droppedItem.columnId };
}

function onSwapDropToCompatibleGroup({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];

  const droppedItemOp = { ...layer.columns[droppedItem.columnId] };
  const dropTargetOp = { ...layer.columns[columnId] };
  const newColumns = { ...layer.columns };
  newColumns[columnId] = droppedItemOp;
  newColumns[droppedItem.columnId] = dropTargetOp;

  const newColumnOrder = [...layer.columnOrder];
  const droppedItemIndex = newColumnOrder.findIndex((c) => c === droppedItem.columnId);
  const dropTargetIndex = newColumnOrder.findIndex((c) => c === columnId);

  newColumnOrder[droppedItemIndex] = columnId;
  newColumnOrder[dropTargetIndex] = droppedItem.columnId;

  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: newColumnOrder,
        columns: newColumns,
      },
    })
  );
  return true;
  // return { deleted: droppedItem.columnId };
}

function onDuplicateDropToCompatibleGroup({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps<DraggedOperation>) {
  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
  const newColumns = {
    ...layer.columns,
    [columnId]: op,
  };

  newColumns[columnId] = op;

  const newColumnOrder = [...layer.columnOrder];
  // put a new bucketed dimension just in front of the metric dimensions, a metric dimension in the back of the array
  // TODO this logic does not take into account groups - we probably need to pass the current
  // group config to this position to place the column right
  const insertionIndex = op.isBucketed
    ? newColumnOrder.findIndex((id) => !newColumns[id].isBucketed)
    : newColumnOrder.length;
  newColumnOrder.splice(insertionIndex, 0, columnId);
  // Time to replace
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: newColumnOrder,
        columns: newColumns,
      },
    })
  );
  return true;
}

function onFieldDrop(props: DropHandlerProps<DraggedField>) {
  const { columnId, setState, state, layerId, droppedItem, groupId, dimensionGroups } = props;

  const operationsForNewField = getOperationTypesForField(
    droppedItem.field,
    props.filterOperations
  );

  if (!isDraggedField(droppedItem) || !operationsForNewField.length) {
    // TODO: What do we do if we couldn't find a column?
    return false;
  }

  const layer = state.layers[layerId];

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;
  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  // Detects if we can change the field only, otherwise change field + operation
  const fieldIsCompatibleWithCurrent =
    selectedColumn && operationsForNewField.includes(selectedColumn.operationType);

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent ? selectedColumn.operationType : operationsForNewField[0],
    field: droppedItem.field,
    visualizationGroups: dimensionGroups,
    targetGroup: groupId,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(mergeLayer({ state, layerId, newLayer }));
  return true;
}
