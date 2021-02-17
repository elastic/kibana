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
  getOperationDisplay,
} from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField, isDraggedField } from '../utils';
import { IndexPatternPrivateState, DraggedField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';

type DropHandlerProps<T> = DatasourceDimensionDropHandlerProps<IndexPatternPrivateState> & {
  droppedItem: T;
};

const operationLabels = getOperationDisplay();

export function getDropProps(
  props: DatasourceDimensionDropProps<IndexPatternPrivateState> & { groupId: string }
): { dropType: DropType; nextLabel?: string } | undefined {
  const { dragging } = props.dragDropContext;
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
        return { dropType: 'field_add', nextLabel: highestPriorityOperationLabel };
      } else if (
        (hasField(currentColumn) && currentColumn.sourceField !== dragging.field.name) ||
        !hasField(currentColumn)
      ) {
        const persistingOperationLabel =
          currentColumn &&
          operationsForNewField.includes(currentColumn.operationType) &&
          operationLabels[currentColumn.operationType].displayName;

        return {
          dropType: 'field_replace',
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
        return { dropType: 'reorder' };
      }
      return { dropType: 'duplicate_in_group' };
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
        return { dropType: 'replace_compatible' }; // in the future also 'swap_compatible' and 'duplicate_compatible'
      } else {
        return { dropType: 'move_compatible' }; // in the future also 'duplicate_compatible'
      }
    }

    // suggest
    const field =
      hasField(op) && props.state.indexPatterns[layerIndexPatternId].getFieldByName(op.sourceField);
    const operationsForNewField = field && getOperationTypesForField(field, props.filterOperations);

    if (operationsForNewField && operationsForNewField?.length) {
      const highestPriorityOperationLabel = operationLabels[operationsForNewField[0]].displayName;

      if (currentColumn) {
        const persistingOperationLabel =
          currentColumn &&
          operationsForNewField.includes(currentColumn.operationType) &&
          operationLabels[currentColumn.operationType].displayName;
        return {
          dropType: 'replace_incompatible',
          nextLabel: persistingOperationLabel || highestPriorityOperationLabel,
        }; // in the future also 'swap_incompatible', 'duplicate_incompatible'
      } else {
        return {
          dropType: 'move_incompatible',
          nextLabel: highestPriorityOperationLabel,
        }; // in the future also 'duplicate_incompatible'
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

function onSameGroupDuplicateDrop({
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

function onMoveDropToCompatibleGroup({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
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
    newColumnOrder[oldIndex] = columnId;
  } else {
    newColumnOrder.splice(oldIndex, 1);
  }

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
  return { deleted: droppedItem.columnId };
}

function onFieldDrop(props: DropHandlerProps<DraggedField>) {
  const { columnId, setState, state, layerId, droppedItem } = props;

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
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(mergeLayer({ state, layerId, newLayer }));
  return true;
}
