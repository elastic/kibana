/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DatasourceDimensionDropProps,
  DatasourceDimensionDropHandlerProps,
  isDraggedOperation,
  DraggedOperation,
} from '../../types';
import { IndexPatternColumn } from '../indexpattern';
import { insertOrReplaceColumn, deleteColumn } from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField, isDraggedField } from '../utils';
import { IndexPatternPrivateState, IndexPatternField, DraggedField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { getOperationSupportMatrix } from './operation_support';

type DropHandlerProps<T> = DatasourceDimensionDropHandlerProps<IndexPatternPrivateState> & {
  droppedItem: T;
};

export function getDropTypes(
  props: DatasourceDimensionDropProps<IndexPatternPrivateState> & { groupId: string }
) {
  const { dragging } = props.dragDropContext;
  if (!dragging) {
    return;
  }

  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return !!getOperationSupportMatrix(props).operationByField[field.name];
  }

  const currentColumn = props.state.layers[props.layerId].columns[props.columnId];
  if (isDraggedField(dragging)) {
    if (
      !!(layerIndexPatternId === dragging.indexPatternId && hasOperationForField(dragging.field))
    ) {
      if (!currentColumn) {
        return 'field_add';
      } else if (
        (hasField(currentColumn) && currentColumn.sourceField !== dragging.field.name) ||
        !hasField(currentColumn)
      ) {
        return 'field_replace';
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
        return 'reorder';
      }
      return 'duplicate_in_group';
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
        return 'replace_compatible'; // in the future also 'swap_compatible' and 'duplicate_compatible'
      } else {
        return 'move_compatible'; // in the future also 'duplicate_compatible'
      }
    }

    // suggest
    const field =
      hasField(op) && props.state.indexPatterns[layerIndexPatternId].getFieldByName(op.sourceField);
    if (field && hasOperationForField(field)) {
      if (currentColumn) {
        return 'replace_incompatible'; // in the future also 'swap_incompatible', 'duplicate_incompatible'
      } else {
        return 'move_incompatible'; // in the future also 'duplicate_incompatible'
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

  const operationSupportMatrix = getOperationSupportMatrix(props);
  const operationsForNewField = operationSupportMatrix.operationByField[field.name];

  if (!operationsForNewField || operationsForNewField.size === 0) {
    return false;
  }

  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  const newLayer = insertOrReplaceColumn({
    layer: deleteColumn({
      layer,
      columnId: droppedItem.columnId,
      indexPattern: currentIndexPattern,
    }),
    columnId,
    indexPattern: currentIndexPattern,
    op: operationsForNewField.values().next().value,
    field,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
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
  const operationSupportMatrix = getOperationSupportMatrix(props);

  function hasOperationForField(field: IndexPatternField) {
    return !!operationSupportMatrix.operationByField[field.name];
  }

  if (!isDraggedField(droppedItem) || !hasOperationForField(droppedItem.field)) {
    // TODO: What do we do if we couldn't find a column?
    return false;
  }

  // dragged field, not operation

  const operationsForNewField = operationSupportMatrix.operationByField[droppedItem.field.name];

  if (!operationsForNewField || operationsForNewField.size === 0) {
    return false;
  }

  const layer = state.layers[layerId];

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;
  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  // Detects if we can change the field only, otherwise change field + operation
  const fieldIsCompatibleWithCurrent =
    selectedColumn &&
    operationSupportMatrix.operationByField[droppedItem.field.name]?.has(
      selectedColumn.operationType
    );

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent
      ? selectedColumn.operationType
      : operationsForNewField.values().next().value,
    field: droppedItem.field,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(mergeLayer({ state, layerId, newLayer }));
  return true;
}
